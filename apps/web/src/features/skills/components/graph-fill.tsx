"use client";

import { useEffect, useRef, useState } from "react";

import { ForceGraph, type GraphData } from "@/features/skills/components/graph/force-graph";

interface GraphFillProps {
  data: GraphData;
  focusNodeId?: string;
}

export function GraphFill({ data, focusNodeId }: GraphFillProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateHeight = () => {
      setHeight(Math.max(container.clientHeight, 200));
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ForceGraph data={data} focusNodeId={focusNodeId} height={height} />
    </div>
  );
}
