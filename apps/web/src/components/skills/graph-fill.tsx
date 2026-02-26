"use client";

import { useEffect, useRef, useState } from "react";

import {
  ForceGraph,
  type GraphData,
  type OnNodeClick,
} from "@/components/skills/graph/force-graph";

interface GraphFillProps {
  data: GraphData;
  focusNodeId?: string;
  onNodeClick?: OnNodeClick;
}

export function GraphFill({ data, focusNodeId, onNodeClick }: GraphFillProps) {
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
      <ForceGraph data={data} focusNodeId={focusNodeId} height={height} onNodeClick={onNodeClick} />
    </div>
  );
}
