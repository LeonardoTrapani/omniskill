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
    { id: "content", label: "content", icon: <FileText className="size-3" aria-hidden="true" /> },
    {
      id: "resources",
      label: "resources",
      icon: <Paperclip className="size-3" aria-hidden="true" />,
    },
    { id: "graph", label: "graph", icon: <Network className="size-3" aria-hidden="true" /> },
  ];

  return (
    <div
      className="flex border-b border-border bg-background/90"
      role="tablist"
      aria-label="Skill detail sections"
    >
      {segments.map((seg) => {
        const isActive = value === seg.id;

        return (
          <button
            key={seg.id}
            type="button"
            id={`skill-mobile-section-tab-${seg.id}`}
            role="tab"
            aria-controls={`skill-mobile-section-panel-${seg.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(seg.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {seg.icon}
            <span>{seg.label}</span>
            {seg.id === "resources" && resourceCount > 0 && (
              <span
                className={cn(
                  "inline-flex min-w-[1rem] items-center justify-center rounded-full border px-1 text-[9px] leading-4",
                  isActive
                    ? "border-border text-foreground"
                    : "border-border/70 text-muted-foreground",
                )}
              >
                {resourceCount}
              </span>
            )}
            {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
