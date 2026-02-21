"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";

import { trpc } from "@/utils/trpc";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: "skill" | "resource";
  label: string;
  description: string | null;
  slug: string | null;
  parentSkillId: string | null;
  kind: string | null;
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  kind: string;
}

export default function SkillGraph() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const { data, isLoading, isError } = useQuery(trpc.skills.graph.queryOptions());

  const skillCount = data?.nodes.filter((n) => n.type === "skill").length ?? 0;
  const resourceCount = data?.nodes.filter((n) => n.type === "resource").length ?? 0;

  const buildGraph = useCallback(
    (container: HTMLDivElement) => {
      if (!data || data.nodes.length === 0) return;

      // Clean up previous
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      d3.select(container).select("svg").remove();

      const width = container.clientWidth;
      const height = 450;

      // Deep-clone nodes/edges so D3 can mutate them
      const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
      const edges: GraphEdge[] = data.edges.map((e) => ({ ...e }));

      const nodeById = new Map(nodes.map((n) => [n.id, n]));

      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      svgRef.current = svg.node();

      // Zoom group
      const g = svg.append("g");

      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoomBehavior);

      // Edges
      const link = g
        .append("g")
        .selectAll<SVGLineElement, GraphEdge>("line")
        .data(edges)
        .join("line")
        .attr("stroke", "var(--muted-foreground)")
        .attr("stroke-opacity", (d) => (d.kind === "parent" ? 0.1 : 0.2))
        .attr("stroke-width", (d) => (d.kind === "parent" ? 0.5 : 1))
        .attr("stroke-dasharray", (d) => (d.kind === "parent" ? "2,2" : "none"));

      // Node groups
      const node = g
        .append("g")
        .selectAll<SVGGElement, GraphNode>("g")
        .data(nodes)
        .join("g")
        .style("cursor", (d) => (d.type === "skill" ? "pointer" : "default"));

      // Circles
      node
        .append("circle")
        .attr("r", (d) => (d.type === "skill" ? 8 : 3.5))
        .attr("fill", (d) => (d.type === "skill" ? "var(--primary)" : "var(--muted-foreground)"))
        .attr("stroke", (d) => (d.type === "skill" ? "var(--primary)" : "none"))
        .attr("stroke-width", (d) => (d.type === "skill" ? 1.5 : 0))
        .attr("stroke-opacity", 0.3);

      // Labels for skills only
      node
        .filter((d) => d.type === "skill")
        .append("text")
        .text((d) => d.label)
        .attr("dx", 12)
        .attr("dy", 4)
        .attr("font-size", "11px")
        .attr("font-family", "var(--font-mono), monospace")
        .attr("fill", "var(--foreground)")
        .attr("pointer-events", "none");

      // Tooltip
      const tooltip = d3.select(tooltipRef.current);

      node
        .on("mouseenter", (_event, d) => {
          tooltip
            .style("opacity", "1")
            .html(
              `<div style="font-weight:600;font-size:12px;">${d.label}</div>` +
                (d.description
                  ? `<div style="font-size:11px;color:var(--muted-foreground);margin-top:2px;">${d.description}</div>`
                  : "") +
                `<div style="font-size:10px;color:var(--muted-foreground);margin-top:2px;">${d.type}${d.kind ? ` / ${d.kind}` : ""}</div>`,
            );
        })
        .on("mousemove", (event) => {
          const containerRect = container.getBoundingClientRect();
          const x = event.clientX - containerRect.left + 12;
          const y = event.clientY - containerRect.top - 10;
          tooltip.style("left", `${x}px`).style("top", `${y}px`);
        })
        .on("mouseleave", () => {
          tooltip.style("opacity", "0");
        })
        .on("click", (_event, d) => {
          if (d.type === "skill" && d.slug) {
            router.push(`/skills/${d.slug}` as Route);
          }
        });

      // Drag behavior
      const drag = d3
        .drag<SVGGElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      node.call(drag);

      // Force simulation
      const simulation = d3
        .forceSimulation<GraphNode>(nodes)
        .force(
          "link",
          d3
            .forceLink<GraphNode, GraphEdge>(edges)
            .id((d) => d.id)
            .distance((d) => (d.kind === "parent" ? 40 : 100)),
        )
        .force(
          "charge",
          d3.forceManyBody<GraphNode>().strength((d) => (d.type === "skill" ? -300 : -80)),
        )
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
          "collide",
          d3.forceCollide<GraphNode>().radius((d) => (d.type === "skill" ? 30 : 12)),
        )
        .on("tick", () => {
          link
            .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
            .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
            .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
            .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

          node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
        });

      simulationRef.current = simulation;
    },
    [data, router],
  );

  // Build / rebuild graph when data or container changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !data || data.nodes.length === 0) return;

    buildGraph(container);

    // ResizeObserver for responsive updates
    const ro = new ResizeObserver(() => {
      buildGraph(container);
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [data, buildGraph]);

  return (
    <div className="border border-border">
      {/* Header */}
      <div className="px-6 md:px-8 pt-8 pb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
          SKILL GRAPH
        </h2>
        {data && data.nodes.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {skillCount} skill{skillCount !== 1 ? "s" : ""} / {resourceCount} resource
            {resourceCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Graph container */}
      <div ref={containerRef} style={{ height: 450 }} className="relative w-full bg-background">
        {/* Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-popover text-popover-foreground border border-border px-3 py-2 text-xs z-10 max-w-[240px]"
          style={{ opacity: 0, transition: "opacity 0.15s" }}
        />

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Failed to load graph</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && data?.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center px-6">
              No skills to visualize &mdash; Add skills to see your knowledge graph
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
