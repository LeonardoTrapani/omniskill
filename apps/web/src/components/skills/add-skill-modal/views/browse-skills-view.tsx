"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search } from "lucide-react";

import type { SelectedSkill } from "@/hooks/skills/use-modal-machine";
import { useDebouncedValue } from "@/hooks/skills/use-skill-search";
import { trpc } from "@/lib/api/trpc";

type ModalAction = { type: "SELECT_SKILL"; skill: SelectedSkill };

interface BrowseSkillsViewProps {
  dispatch: Dispatch<ModalAction>;
}

const PAGE_SIZE = 10;

export default function BrowseSkillsView({ dispatch }: BrowseSkillsViewProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery(
    trpc.skills.list.infiniteQueryOptions(
      { limit: PAGE_SIZE, search: debouncedSearch || undefined },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      },
    ),
  );

  const skills = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }
    fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center gap-3 border border-border px-4 py-3 transition-colors focus-within:border-primary/50">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search skills ..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          autoFocus
        />
      </div>

      <div className="max-h-[50vh] overflow-y-auto border border-border">
        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading skills...</p>
          </div>
        ) : null}

        {!isLoading && skills.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {search.trim() ? (
                <>No skills matching &ldquo;{search}&rdquo;</>
              ) : (
                "No skills available"
              )}
            </p>
          </div>
        ) : null}

        {!isLoading
          ? skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center justify-between border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-secondary/50"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">{skill.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{skill.slug}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {skill.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "SELECT_SKILL",
                      skill: {
                        id: skill.id,
                        name: skill.name,
                        slug: skill.slug,
                        description: skill.description,
                      },
                    })
                  }
                  className="flex shrink-0 items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  <span className="hidden sm:inline">Add</span>
                </button>
              </div>
            ))
          : null}

        <div ref={sentinelRef} className="h-1" />

        {isFetchingNextPage ? (
          <div className="py-4 text-center">
            <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
