"use client";

import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { ForceGraph } from "@/components/graph/force-graph";
import { trpc } from "@/utils/trpc";

export default function SkillGraph() {
  const { data, isLoading, isError } = useQuery(trpc.skills.graph.queryOptions());

  const skillCount = data?.nodes.filter((n) => n.type === "skill").length ?? 0;
  const resourceCount = data?.nodes.filter((n) => n.type === "resource").length ?? 0;

  return (
    <div className="border border-border">
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

      {isLoading && (
        <div className="flex items-center justify-center" style={{ height: 450 }}>
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center" style={{ height: 450 }}>
          <p className="text-sm text-muted-foreground">Failed to load graph</p>
        </div>
      )}

      {!isLoading && !isError && data && <ForceGraph data={data} height={450} />}
    </div>
  );
}
