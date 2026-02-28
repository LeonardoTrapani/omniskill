"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import * as d3 from "d3";

import { canRenderResourceAsMarkdown } from "@/components/markdown/resource-file";
import { NodePreviewCard } from "@/components/skills/graph/node-preview-card";
import { buildResourceHref, buildSkillHref } from "@/lib/skills/routes";
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

/**
 * Optional callback fired when a graph node is clicked.
 * Return `true` to prevent the default `router.push` navigation.
 */
export type OnNodeClick = (node: GraphNode) => boolean | void;

interface ForceGraphProps {
  data: GraphData;
  height?: number;
  focusNodeId?: string;
  className?: string;
  centerXBias?: number;
  mobileInitialScale?: number;
  onNodeClick?: OnNodeClick;
}

/** Build a map of nodeId → Set of connected nodeIds */
function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    const sId = typeof e.source === "object" ? (e.source as GraphNode).id : (e.source as string);
    const tId = typeof e.target === "object" ? (e.target as GraphNode).id : (e.target as string);
    if (!adj.has(sId)) adj.set(sId, new Set());
    if (!adj.has(tId)) adj.set(tId, new Set());
    adj.get(sId)!.add(tId);
    adj.get(tId)!.add(sId);
  }
  return adj;
}

const TRANSITION_MS = 180;

function getResourceNodeColors(isDarkMode: boolean) {
  if (isDarkMode) {
    return {
      defaultFill: "var(--muted-foreground)",
      activeFill: "oklch(87% 0 0)",
    };
  }

  return {
    defaultFill: "oklch(87% 0 0)",
    activeFill: "var(--muted-foreground)",
  };
}

export function ForceGraph({
  data,
  height = 450,
  focusNodeId,
  className,
  centerXBias = 0,
  mobileInitialScale = 1,
  onNodeClick,
}: ForceGraphProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const isDarkMode = resolvedTheme === "dark";

  const resourceNodeColors = useMemo(() => getResourceNodeColors(isDarkMode), [isDarkMode]);

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

      /* ── Grid background pattern ── */
      const defs = svg.append("defs");
      const gridSize = 34;
      const pattern = defs
        .append("pattern")
        .attr("id", "graph-grid")
        .attr("width", gridSize)
        .attr("height", gridSize)
        .attr("patternUnits", "userSpaceOnUse");
      pattern
        .append("line")
        .attr("x1", gridSize)
        .attr("y1", 0)
        .attr("x2", gridSize)
        .attr("y2", gridSize)
        .attr("stroke", "var(--border)")
        .attr("stroke-opacity", 0.45)
        .attr("stroke-width", 1);
      pattern
        .append("line")
        .attr("x1", 0)
        .attr("y1", gridSize)
        .attr("x2", gridSize)
        .attr("y2", gridSize)
        .attr("stroke", "var(--border)")
        .attr("stroke-opacity", 0.45)
        .attr("stroke-width", 1);

      // grid background rect (behind everything, not affected by zoom)
      svg
        .append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "url(#graph-grid)")
        .attr("opacity", 0.5);

      const g = svg.append("g");

      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => g.attr("transform", event.transform));

      svg.call(zoomBehavior);

      // keep desktop zoom unchanged; allow mobile-only zoom-out
      const isMobileViewport = window.innerWidth < 1024;
      const initialScale = isMobileViewport ? mobileInitialScale : 1.1;
      const initialTransform = d3.zoomIdentity
        .translate(centerX * (1 - initialScale), centerY * (1 - initialScale))
        .scale(initialScale);
      svg.call(zoomBehavior.transform, initialTransform);

      /* ── Edges ── */
      const linkG = g.append("g");
      const link = linkG
        .selectAll<SVGLineElement, GraphEdge>("line")
        .data(edges)
        .join("line")
        .attr("stroke", "var(--muted-foreground)")
        .attr("stroke-opacity", (d) => (d.kind === "parent" ? 0.12 : 0.3))
        .attr("stroke-width", (d) => (d.kind === "parent" ? 0.75 : 1.5))
        .attr("stroke-linecap", "round");

      /* ── Node groups ── */
      const nodeG = g.append("g");
      const node = nodeG
        .selectAll<SVGGElement, GraphNode>("g")
        .data(nodes)
        .join("g")
        .style("cursor", "pointer");

      /* ── Circles ── */
      const isFocus = (d: GraphNode) => !!(focusNodeId && d.id === focusNodeId);
      const baseRadius = (d: GraphNode) => (d.type === "skill" ? 8 : 3.5);
      const focusRadius = (d: GraphNode) => (d.type === "skill" ? 9 : 4.5);

      const circles = node
        .append("circle")
        .attr("r", (d) => (isFocus(d) ? focusRadius(d) : baseRadius(d)))
        .attr("fill", (d) => {
          if (d.type === "skill") return "var(--primary)";
          return isFocus(d) ? resourceNodeColors.activeFill : resourceNodeColors.defaultFill;
        })
        .attr("fill-opacity", (d) => (d.type === "skill" ? 1 : 1))
        .attr("stroke", (d) => {
          return d.type === "skill" ? "var(--primary)" : "none";
        })
        .attr("stroke-width", (d) => (d.type === "skill" ? 1.5 : 0))
        .attr("stroke-opacity", (d) => {
          if (d.type !== "skill") return 0;
          return isFocus(d) ? 0.35 : 0.25;
        });

      /* ── Labels for skills ── */
      node
        .filter((d) => d.type === "skill")
        .append("text")
        .text((d) => d.label)
        .attr("dx", 12)
        .attr("dy", 4)
        .attr("font-size", "11px")
        .attr("font-family", "var(--font-mono), monospace")
        .attr("fill", "var(--foreground)")
        .attr("opacity", 0.6)
        .attr("pointer-events", "none");

      /* ── Hover highlight logic ── */
      const highlightNode = (hovId: string) => {
        const adj = buildAdjacency(edges);
        const connected = adj.get(hovId) ?? new Set<string>();
        const isActive = (d: GraphNode) => d.id === hovId || connected.has(d.id);

        // Dim non-connected node groups
        node
          .transition()
          .duration(TRANSITION_MS)
          .style("opacity", (d) => (isActive(d) ? 1 : 0.12));

        // Connected resources transition to lighter color; skills stay primary always
        circles
          .transition()
          .duration(TRANSITION_MS)
          .attr("fill", (d) => {
            if (d.type === "skill") return "var(--primary)"; // skills always primary
            if (isFocus(d)) return resourceNodeColors.activeFill;
            return isActive(d) ? resourceNodeColors.activeFill : resourceNodeColors.defaultFill;
          })
          .attr("r", (d) => (isFocus(d) ? focusRadius(d) : baseRadius(d)));

        // Dim non-connected edges, brighten connected ones
        link
          .transition()
          .duration(TRANSITION_MS)
          .attr("stroke-opacity", (d) => {
            const sId =
              typeof d.source === "object" ? (d.source as GraphNode).id : (d.source as string);
            const tId =
              typeof d.target === "object" ? (d.target as GraphNode).id : (d.target as string);
            const isConnected = sId === hovId || tId === hovId;
            if (isConnected) return d.kind === "parent" ? 0.4 : 0.7;
            return 0.04;
          });
      };

      const resetHighlight = () => {
        node.transition().duration(TRANSITION_MS).style("opacity", 1);

        // Reset resource circles to default color and size; skills unchanged
        circles
          .transition()
          .duration(TRANSITION_MS)
          .attr("fill", (d) => {
            if (d.type === "skill") return "var(--primary)";
            return isFocus(d) ? resourceNodeColors.activeFill : resourceNodeColors.defaultFill;
          })
          .attr("r", (d) => (isFocus(d) ? focusRadius(d) : baseRadius(d)));

        link
          .transition()
          .duration(TRANSITION_MS)
          .attr("stroke-opacity", (d) => (d.kind === "parent" ? 0.12 : 0.3));
      };

      /* ── Hover & click ── */
      node
        .on("mouseenter", (_event, d) => {
          setHoveredNode(d);
          highlightNode(d.id);
        })
        .on("mousemove", (event) => {
          setTooltipPos({
            x: event.clientX + 12,
            y: event.clientY - 10,
          });
        })
        .on("mouseleave", () => {
          setHoveredNode(null);
          resetHighlight();
        })
        .on("click", (_event, d) => {
          if (onNodeClick?.(d) === true) return;
          if (d.type === "skill") {
            router.push(buildSkillHref(d.id));
          } else if (d.parentSkillId) {
            const href = buildResourceHref(d.parentSkillId, d.label);
            router.push(href);
          }
        });

      /* ── Drag ── */
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

      /* ── Simulation ── */
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
    [
      data,
      height,
      focusNodeId,
      router,
      centerXBias,
      mobileInitialScale,
      onNodeClick,
      resourceNodeColors,
    ],
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
            previewUnavailable:
              hoveredNode.type === "resource" &&
              !canRenderResourceAsMarkdown(hoveredNode.label, hoveredNode.kind ?? "reference"),
          }}
        />
      </div>
    ) : null;

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={cn("relative w-full overflow-hidden bg-background", className)}
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
