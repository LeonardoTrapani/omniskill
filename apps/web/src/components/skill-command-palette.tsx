"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Search, Copy, ArrowUp, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSkillSearch } from "@/hooks/use-skill-search";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Trigger button — render in as many places as needed, all point to the same palette */
export function SkillCommandTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-2 text-muted-foreground"
      onClick={onOpen}
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline text-xs">Search...</span>
      <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-[11px]">⌘</span>K
      </kbd>
    </Button>
  );
}

/** Dialog + keyboard listener — render once */
export function SkillCommandPalette({
  open,
  onOpenChange,
  initialSearch,
  skillCount = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
  skillCount?: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // sync initialSearch when it changes (e.g. from ?q= param)
  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const {
    items: suggestions,
    isLoading,
    isFetching,
    hasQuery,
    debouncedQuery,
    canLoadMore,
    loadMore,
  } = useSkillSearch({
    query: search,
    enabled: open,
    scope: "all",
    visibility: "public",
    initialLimit: 5,
    limitStep: 5,
    maxLimit: 50,
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedQuery]);

  // focus input when dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setSelectedIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    if (selectedIndex < 0) return;
    resultItemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Infinite scrolling for mouse/touch scrolling in the results list
  useEffect(() => {
    if (!open || !hasQuery) return;
    const root = listRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && canLoadMore && !isFetching) {
          loadMore();
        }
      },
      {
        root,
        rootMargin: "80px",
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasQuery, canLoadMore, isFetching, loadMore, suggestions.length]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) setSearch("");
    },
    [onOpenChange],
  );

  const openSkill = useCallback(
    (skillId: string) => {
      handleOpenChange(false);
      router.push(`/dashboard/skills/${skillId}`);
    },
    [handleOpenChange, router],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!suggestions.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => {
          const next = i < 0 ? 0 : Math.min(i + 1, suggestions.length - 1);
          if (next >= suggestions.length - 1 && canLoadMore && !isFetching) {
            loadMore();
          }
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => {
          if (i < 0) return 0;
          return Math.max(i - 1, 0);
        });
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        const skill = suggestions[selectedIndex];
        if (skill) {
          openSkill(skill.id);
        }
      }
    },
    [suggestions, selectedIndex, openSkill, canLoadMore, isFetching, loadMore],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;

    const selected = selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
    if (selected) {
      openSkill(selected.id);
      return;
    }

    handleOpenChange(false);
    router.push(`/skills?q=${encodeURIComponent(query)}`);
  };

  const showSuggestions = hasQuery && (isLoading || suggestions.length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogHeader className="sr-only">
          <DialogTitle>Search skills</DialogTitle>
          <DialogDescription>Search for skills in the registry</DialogDescription>
        </DialogHeader>
        <DialogContent
          className="p-0 top-[30%] translate-y-0 sm:max-w-2xl gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search skills…"
              name="command-search"
              autoComplete="off"
              className="w-full bg-transparent px-1 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none"
              aria-label="Search for a skill"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Copy className="w-3 h-3" />
                {skillCount > 0 && <span>{skillCount} skills in the registry</span>}
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
              >
                Open
                <ArrowUp className="w-2.5 h-2.5" />
              </button>
            </div>
          </form>

          {showSuggestions && (
            <div
              ref={listRef}
              className="max-h-[205px] overflow-y-auto border-t border-border"
              onScroll={(e) => {
                const element = e.currentTarget;
                const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
                if (remaining < 16 && canLoadMore && !isFetching) {
                  loadMore();
                }
              }}
            >
              {isLoading && suggestions.length === 0 && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {suggestions.map((skill, index) => (
                <button
                  key={skill.id}
                  type="button"
                  ref={(element) => {
                    resultItemRefs.current[index] = element;
                  }}
                  onClick={() => openSkill(skill.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center gap-3 w-full px-6 py-2.5 text-left text-sm text-muted-foreground transition-colors",
                    selectedIndex === index
                      ? "bg-secondary/50 text-foreground"
                      : "hover:text-foreground hover:bg-secondary/50",
                  )}
                >
                  <Search className="size-3.5 flex-shrink-0 opacity-50" />
                  {skill.name}
                </button>
              ))}

              <div ref={sentinelRef} className="h-1" aria-hidden="true" />

              {isFetching && suggestions.length > 0 && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
