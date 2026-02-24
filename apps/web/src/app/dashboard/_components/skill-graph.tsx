"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ForceGraph } from "@/components/graph/force-graph";
import { trpc } from "@/utils/trpc";

interface SkillGraphProps {
  height?: number;
}

export default function SkillGraph({ height }: SkillGraphProps) {
  const { data, isLoading, isError } = useQuery(trpc.skills.graph.queryOptions());
  const graphViewportRef = useRef<HTMLDivElement>(null);
  const [graphHeight, setGraphHeight] = useState(() => {
    if (!height) {
      return 450;
    }

    return Math.max(height - 80, 240);
  });

  useEffect(() => {
    if (!height) {
      setGraphHeight(450);
      return;
    }

    const viewport = graphViewportRef.current;
    if (!viewport) {
      return;
    }

    const updateHeight = () => {
      setGraphHeight(Math.max(viewport.clientHeight, 240));
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, [height]);

  const forceGraphHeight = height ? graphHeight : 450;

  const skillCount = data?.nodes.filter((n) => n.type === "skill").length ?? 0;
  const resourceCount = data?.nodes.filter((n) => n.type === "resource").length ?? 0;

  return (
    <div
      className="border border-border bg-background/90 backdrop-blur-sm flex flex-col min-h-0"
      style={height ? { height } : undefined}
    >
      <div className="px-6 md:px-8 pt-7 pb-4 flex items-center justify-between border-b border-border/70">
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

      <div
        ref={graphViewportRef}
        className={height ? "flex-1 min-h-0 relative overflow-hidden" : "relative overflow-hidden"}
        style={!height ? { height: forceGraphHeight } : undefined}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_12%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_28%),radial-gradient(circle_at_88%_84%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_34%)]" />

        {isLoading && (
          <div className="relative flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="relative flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Failed to load graph</p>
          </div>
        )}

        {!isLoading && !isError && data && <ForceGraph data={data} height={forceGraphHeight} />}
      </div>
    </div>
  );
}
