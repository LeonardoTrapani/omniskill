"use client";

import { useRef, useEffect } from "react";
import { X } from "lucide-react";

import type { ContentTab } from "@/hooks/skills/use-resource-tabs";
import { cn } from "@/lib/utils";

export function ContentTabBar({
  tabs,
  activeTabId,
  onSwitch,
  onClose,
}: {
  tabs: ContentTab[];
  activeTabId: string;
  onSwitch: (tabId: string) => void;
  onClose: (tabId: string) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll the active tab into view when it changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTabId]);

  return (
    <div className="flex items-stretch overflow-x-auto bg-background scrollbar-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isSkillTab = tab.kind === "skill";

        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onSwitch(tab.id)}
            className={cn(
              "group relative flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-2 text-[11px] font-mono transition-colors duration-150",
              isActive
                ? "bg-background text-foreground"
                : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {/* Active indicator bar */}
            {isActive && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-primary" />}

            <span className="max-w-[160px] truncate">{tab.label}</span>

            {/* Close button (not on skill tab) */}
            {!isSkillTab && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onClose(tab.id);
                  }
                }}
                className={cn(
                  "ml-0.5 inline-flex items-center justify-center p-0.5 transition-colors",
                  isActive
                    ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    : "text-transparent group-hover:text-muted-foreground group-hover:hover:bg-secondary group-hover:hover:text-foreground",
                )}
                aria-label={`Close ${tab.label}`}
              >
                <X className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
