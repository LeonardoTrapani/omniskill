"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as d3 from "d3";

import { NodePreviewCard } from "@/components/graph/node-preview-card";
import { buildResourceHref } from "@/components/skills/resource-link";
import { cn } from "@/lib/utils";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: "skill" | "resource";
  label: string;
  description: string | null;
  slug: string | null;
  parentSkillId: string | null;
  kind: string | null;
  contentSnippet: string | null;
  updatedAt: string | null;
}

export interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  id: string;
  kind: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ForceGraphProps {
  data: GraphData;
  height?: number;
  focusNodeId?: string;
  className?: string;
  centerXBias?: number;
}

export function ForceGraph({
  data,
  height = 450,
  focusNodeId,
  className,
  centerXBias = 0,
}: ForceGraphProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  const parentSkillName = useMemo(() => {
    if (!hoveredNode || hoveredNode.type !== "resource" || !hoveredNode.parentSkillId) return null;
    return nodeById.get(hoveredNode.parentSkillId)?.label ?? null;
  }, [hoveredNode, nodeById]);

  const buildGraph = useCallback(
    (container: HTMLDivElement) => {
      if (data.nodes.length === 0) return;

      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      d3.select(container).select("svg").remove();

      const width = container.clientWidth;
      const clampedCenterXBias = Math.max(-0.3, Math.min(0.3, centerXBias));
      const centerX = width * (0.5 + clampedCenterXBias);
      const centerY = height / 2;
      const nodes: GraphNode[] = data.nodes.map((n) => ({ ...n }));
      const edges: GraphEdge[] = data.edges.map((e) => ({ ...e }));

      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("display", "block");

      const g = svg.append("g");

      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => g.attr("transform", event.transform));

      svg.call(zoomBehavior);

      // default zoom near 1:1 to show more of the graph
      const initialScale = 1.1;
      const initialTransform = d3.zoomIdentity
        .translate(centerX * (1 - initialScale), centerY * (1 - initialScale))
        .scale(initialScale);
      svg.call(zoomBehavior.transform, initialTransform);

      // edges
      const link = g
        .append("g")
        .selectAll<SVGLineElement, GraphEdge>("line")
        .data(edges)
        .join("line")
        .attr("stroke", "var(--muted-foreground)")
        .attr("stroke-opacity", (d) => (d.kind === "parent" ? 0.15 : 0.35))
        .attr("stroke-width", (d) => (d.kind === "parent" ? 0.75 : 1.5));

      // node groups
      const node = g
        .append("g")
        .selectAll<SVGGElement, GraphNode>("g")
        .data(nodes)
        .join("g")
        .style("cursor", "pointer");

      // circles
      node
        .append("circle")
        .attr("r", (d) => {
          if (focusNodeId && d.id === focusNodeId) return 10;
          return d.type === "skill" ? 8 : 3.5;
        })
        .attr("fill", (d) => (d.type === "skill" ? "var(--primary)" : "var(--muted-foreground)"))
        .attr("stroke", (d) => {
          if (focusNodeId && d.id === focusNodeId) return "var(--primary)";
          return d.type === "skill" ? "var(--primary)" : "none";
        })
        .attr("stroke-width", (d) => {
          if (focusNodeId && d.id === focusNodeId) return 3;
          return d.type === "skill" ? 1.5 : 0;
        })
        .attr("stroke-opacity", (d) => (focusNodeId && d.id === focusNodeId ? 0.4 : 0.3));

      // labels for skills
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

      // hover and click
      node
        .on("mouseenter", (_event, d) => setHoveredNode(d))
        .on("mousemove", (event) => {
          setTooltipPos({
            x: event.clientX + 12,
            y: event.clientY - 10,
          });
        })
        .on("mouseleave", () => setHoveredNode(null))
        .on("click", (_event, d) => {
          if (d.type === "skill") {
            router.push(`/dashboard/skills/${d.id}` as Route);
          } else if (d.parentSkillId) {
            router.push(buildResourceHref(d.parentSkillId, d.label));
          }
        });

      // drag
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

      // simulation
      const simulation = d3
        .forceSimulation<GraphNode>(nodes)
        .force(
          "link",
          d3
            .forceLink<GraphNode, GraphEdge>(edges)
            .id((d) => d.id)
            .distance((d) => (d.kind === "parent" ? 40 : 80)),
        )
        .force(
          "charge",
          d3.forceManyBody<GraphNode>().strength((d) => (d.type === "skill" ? -120 : -30)),
        )
        .force("center", d3.forceCenter(centerX, centerY))
        .force("x", d3.forceX<GraphNode>(centerX).strength(0.05))
        .force("y", d3.forceY<GraphNode>(centerY).strength(0.05))
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
    [data, height, focusNodeId, router, centerXBias],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.nodes.length === 0) return;

    buildGraph(container);

    const ro = new ResizeObserver(() => buildGraph(container));
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [data, buildGraph]);

  // Count resources connected to the hovered skill
  const hoveredResourceCount = useMemo(() => {
    if (!hoveredNode || hoveredNode.type !== "skill") return 0;
    return data.edges.filter((e) => {
      const sourceId = typeof e.source === "object" ? (e.source as GraphNode).id : e.source;
      return sourceId === hoveredNode.id && e.kind === "parent";
    }).length;
  }, [hoveredNode, data.edges]);

  const tooltipLeft = isMounted
    ? Math.max(12, Math.min(tooltipPos.x, window.innerWidth - 352))
    : tooltipPos.x;
  const tooltipTop = isMounted
    ? Math.max(12, Math.min(tooltipPos.y, window.innerHeight - 280))
    : tooltipPos.y;

  const tooltip =
    hoveredNode && isMounted ? (
      <div
        className="pointer-events-none fixed z-[80]"
        style={{ left: tooltipLeft, top: tooltipTop }}
      >
        <NodePreviewCard
          data={{
            label: hoveredNode.label,
            type: hoveredNode.type,
            description: hoveredNode.description,
            contentSnippet: hoveredNode.contentSnippet,
            slug: hoveredNode.slug,
            kind: hoveredNode.kind,
            parentSkillName,
            updatedAt: hoveredNode.updatedAt,
            resourceCount: hoveredResourceCount,
          }}
        />
      </div>
    ) : null;

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={cn("relative w-full bg-background", className)}
    >
      {tooltip ? createPortal(tooltip, document.body) : null}

      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center px-6">
            No connections to visualize
          </p>
        </div>
      )}
    </div>
  );
}
