"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ForceGraph } from "@/components/skills/graph/force-graph";
import { GridBackground } from "@/components/ui/grid-background";
import { trpc } from "@/lib/api/trpc";
import { cn } from "@/lib/utils";

interface SkillGraphProps {
  height?: number;
  className?: string;
  variant?: "panel" | "background";
}

export default function SkillGraph({ height, className, variant = "panel" }: SkillGraphProps) {
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
  const graphCenterXBias = variant === "background" ? -0.18 : 0;

  return (
    <div
      className={cn(
        "flex flex-col min-h-0",
        variant === "panel" ? "border border-border bg-background/90 backdrop-blur-sm" : "",
        className,
      )}
      style={height ? { height } : undefined}
    >
      <div
        ref={graphViewportRef}
        className={height ? "flex-1 min-h-0 relative overflow-hidden" : "relative overflow-hidden"}
        style={!height ? { height: forceGraphHeight } : undefined}
      >
        {variant === "panel" && <GridBackground className="opacity-32" />}

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

        {!isLoading && !isError && data && (
          <ForceGraph
            data={data}
            height={forceGraphHeight}
            centerXBias={graphCenterXBias}
            mobileInitialScale={0.9}
          />
        )}
      </div>
    </div>
  );
}
