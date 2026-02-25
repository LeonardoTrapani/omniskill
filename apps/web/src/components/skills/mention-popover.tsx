"use client";

import { useEffect, useRef } from "react";
import { FileText, Loader2, Network, Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MentionItem } from "@/hooks/use-mention-autocomplete";

export interface MentionPopoverProps {
  open: boolean;
  anchor: { top: number; left: number } | null;
  items: MentionItem[];
  selectedIndex: number;
  isLoading: boolean;
  query: string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

export default function MentionPopover({
  open,
  anchor,
  items,
  selectedIndex,
  isLoading,
  query,
  onSelect,
  onHover,
}: MentionPopoverProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open || !anchor) return null;

  const skills = items.filter((i) => i.type === "skill");
  const resources = items.filter((i) => i.type === "resource");
  const hasResults = items.length > 0;
  const showEmpty = !isLoading && !hasResults && query.length > 0;

  // Track global index for keyboard nav across groups
  let globalIndex = -1;

  return (
    <div
      className="absolute z-50 flex max-h-[26rem] w-72 flex-col overflow-hidden border border-border bg-popover text-popover-foreground shadow-lg"
      style={{ top: anchor.top + 4, left: anchor.left }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/70">
        <Network className="size-3 text-muted-foreground" aria-hidden="true" />
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Link mention
        </span>
        {isLoading && (
          <Loader2
            className="ml-auto size-3 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* Skills group */}
        {skills.length > 0 && (
          <div>
            <div className="px-3 pt-2 pb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
                Skills
              </span>
            </div>
            {skills.map((item) => {
              globalIndex++;
              const idx = globalIndex;
              return (
                <MentionResultItem
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  item={item}
                  isSelected={selectedIndex === idx}
                  onSelect={() => onSelect(idx)}
                  onHover={() => onHover(idx)}
                />
              );
            })}
          </div>
        )}

        {/* Resources group */}
        {resources.length > 0 && (
          <div>
            <div className="px-3 pt-2 pb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground/60">
                Resources
              </span>
            </div>
            {resources.map((item) => {
              globalIndex++;
              const idx = globalIndex;
              return (
                <MentionResultItem
                  key={item.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  item={item}
                  isSelected={selectedIndex === idx}
                  onSelect={() => onSelect(idx)}
                  onHover={() => onHover(idx)}
                />
              );
            })}
          </div>
        )}

        {/* Loading state */}
        {isLoading && !hasResults && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {/* Empty state */}
        {showEmpty && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">No matches found</p>
          </div>
        )}

        {/* Prompt state: no query yet */}
        {!isLoading && items.length === 0 && query.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground">Type to search skills and resources</p>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-border/70 text-[10px] text-muted-foreground/60">
        <span>
          <kbd className="font-mono">↑↓</kbd> navigate
        </span>
        <span>
          <kbd className="font-mono">↵</kbd> insert
        </span>
        <span>
          <kbd className="font-mono">esc</kbd> dismiss
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

import { forwardRef } from "react";

const MentionResultItem = forwardRef<
  HTMLButtonElement,
  {
    item: MentionItem;
    isSelected: boolean;
    onSelect: () => void;
    onHover: () => void;
  }
>(function MentionResultItem({ item, isSelected, onSelect, onHover }, ref) {
  const Icon = item.type === "skill" ? FileText : Paperclip;

  return (
    <button
      ref={ref}
      type="button"
      onMouseDown={(e) => {
        // Prevent blur on the editor
        e.preventDefault();
        onSelect();
      }}
      onMouseEnter={onHover}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-1.5 text-left transition-colors duration-75",
        isSelected
          ? "bg-secondary/60 text-foreground"
          : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground",
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-50" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{item.label}</p>
        {item.subtitle && (
          <p className="truncate text-[10px] text-muted-foreground/70">{item.subtitle}</p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 px-1.5 py-0.5 text-[9px] uppercase tracking-wider",
          item.type === "skill"
            ? "bg-primary/10 text-primary"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        )}
      >
        {item.type}
      </span>
    </button>
  );
});
