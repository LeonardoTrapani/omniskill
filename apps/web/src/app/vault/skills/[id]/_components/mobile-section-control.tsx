"use client";

import { FileText, Network, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";

export type MobileSection = "content" | "resources" | "graph";

export function MobileSectionControl({
  value,
  onChange,
  resourceCount,
}: {
  value: MobileSection;
  onChange: (section: MobileSection) => void;
  resourceCount: number;
}) {
  const segments: { id: MobileSection; label: string; icon: React.ReactNode }[] = [
    { id: "content", label: "Content", icon: <FileText className="size-3" /> },
    {
      id: "resources",
      label: `Resources${resourceCount > 0 ? ` (${resourceCount})` : ""}`,
      icon: <Paperclip className="size-3" />,
    },
    { id: "graph", label: "Graph", icon: <Network className="size-3" /> },
  ];

  return (
    <div className="mt-3 flex gap-0.5 border border-border bg-secondary/30 p-0.5">
      {segments.map((seg) => (
        <button
          key={seg.id}
          type="button"
          onClick={() => onChange(seg.id)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 text-[10px] font-mono uppercase tracking-wider transition-all",
            value === seg.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {seg.icon}
          {seg.label}
        </button>
      ))}
    </div>
  );
}
