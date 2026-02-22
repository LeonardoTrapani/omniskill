"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import * as d3 from "d3";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { buildResourceHref } from "@/components/skills/resource-link";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
}

export function ForceGraph({ data, height = 450, focusNodeId, className }: ForceGraphProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
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

      // default zoom slightly in, centered
      const initialScale = 1.4;
      const initialTransform = d3.zoomIdentity
        .translate((width / 2) * (1 - initialScale), (height / 2) * (1 - initialScale))
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
          const rect = container.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left + 12,
            y: event.clientY - rect.top - 10,
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
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX<GraphNode>(width / 2).strength(0.05))
        .force("y", d3.forceY<GraphNode>(height / 2).strength(0.05))
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
    [data, height, focusNodeId, router],
  );

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

  const snippet = hoveredNode?.contentSnippet
    ? hoveredNode.contentSnippet.length > 240
      ? `${hoveredNode.contentSnippet.slice(0, 240)}...`
      : hoveredNode.contentSnippet
    : null;

  const hoveredUpdatedAt = hoveredNode?.updatedAt
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
        new Date(hoveredNode.updatedAt),
      )
    : null;

  const isSkill = hoveredNode?.type === "skill";

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={cn("relative w-full bg-background", className)}
    >
      {hoveredNode && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="ring-foreground/10 bg-popover text-popover-foreground w-[360px] overflow-hidden rounded-none p-2.5 text-xs/relaxed shadow-md ring-1">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm truncate">{hoveredNode.label}</p>
                <Badge variant="outline">
                  {isSkill ? "skill" : (hoveredNode.kind ?? "resource")}
                </Badge>
              </div>

              {isSkill && hoveredNode.slug ? (
                <p className="text-xs text-muted-foreground">From slug: {hoveredNode.slug}</p>
              ) : null}

              {!isSkill && parentSkillName ? (
                <p className="text-xs text-muted-foreground">From skill: {parentSkillName}</p>
              ) : null}

              <Separator />

              <div className="rounded-none border border-border bg-secondary/20 p-3 min-w-0">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="size-3" aria-hidden="true" />
                  {isSkill ? "Skill preview" : "Resource preview"}
                </p>
                {snippet ? (
                  <article className="prose prose-sm max-w-none overflow-hidden text-xs leading-5 prose-p:my-1 prose-code:rounded-none prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 [&_*]:max-w-full [&_a]:break-all [&_code]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_ul]:pl-4 [&_ol]:pl-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>
                      {snippet}
                    </ReactMarkdown>
                  </article>
                ) : hoveredNode.description ? (
                  <p className="text-xs leading-5 break-words">{hoveredNode.description}</p>
                ) : (
                  <p className="text-xs leading-5 whitespace-pre-wrap break-words">(empty)</p>
                )}
              </div>

              {hoveredUpdatedAt && (
                <p className="text-[11px] text-muted-foreground">Updated {hoveredUpdatedAt}</p>
              )}
            </div>
          </div>
        </div>
      )}

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
