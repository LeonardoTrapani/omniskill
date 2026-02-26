"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, ArrowRight, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { useAddSkillFlow } from "@/hooks/skills/use-add-skill-flow";
import { buildSkillHref } from "@/lib/skills/routes";
import { useSkillSearch } from "@/hooks/skills/use-skill-search";
import { trpc } from "@/lib/api/trpc";
import { cn } from "@/lib/utils";
import AddSkillModal from "@/components/skills/add-skill-modal";

/* ── Row reveal animation ──────────────────────────────────────────── */
const ROW_ANIMATION_STYLE = `
@keyframes skillRowIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
` as const;

const MAX_STAGGER_INDEX = 20;
const STAGGER_DELAY_MS = 35;
const ANIMATION_DURATION_MS = 300;
const INITIAL_BASE_DELAY_MS = 400;

let animatedIds = new Set<string>();
let lastSearchKey = "";

interface SkillsTableProps {
  limit?: number;
  showSearch?: boolean;
  showViewAll?: boolean;
  infiniteScroll?: boolean;
  initialSearch?: string;
  className?: string;
}

export default function SkillsTable({
  limit,
  showSearch = true,
  showViewAll = true,
  infiniteScroll = false,
  initialSearch = "",
  className,
}: SkillsTableProps) {
  const [search, setSearch] = useState(initialSearch);
  const { selectedSkill, modalOpen, openAddSkillFlow, closeAddSkillFlow } = useAddSkillFlow({
    loginNext: "/skills",
  });

  const pageSize = limit ?? 50;
  const hasSearchQuery = search.trim().length > 0;

  const {
    items: searchedSkills,
    isLoading: isSearchLoading,
    isError: isSearchError,
    isFetching: isSearchFetching,
    debouncedQuery,
    canLoadMore: canLoadMoreSearch,
    loadMore: loadMoreSearch,
  } = useSkillSearch({
    query: search,
    enabled: hasSearchQuery,
    scope: "all",
    visibility: "public",
    initialLimit: 5,
    limitStep: 5,
    maxLimit: 50,
  });

  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      ...trpc.skills.list.infiniteQueryOptions(
        {
          limit: pageSize,
          visibility: "public",
        },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        },
      ),
      enabled: !hasSearchQuery,
    });

  const pages = data?.pages ?? [];
  const listedSkills = pages.flatMap((page) => page.items);
  const nextCursor = pages.at(-1)?.nextCursor;
  const skills = hasSearchQuery ? searchedSkills : listedSkills;
  const isSearchDebouncing = hasSearchQuery && search.trim() !== debouncedQuery;
  const tableLoading = hasSearchQuery ? isSearchLoading || isSearchDebouncing : isLoading;
  const tableError = hasSearchQuery ? isSearchError : isError;
  const hasMoreResults = hasSearchQuery ? canLoadMoreSearch : Boolean(hasNextPage);
  const isFetchingMore = hasSearchQuery ? isSearchFetching && !isSearchLoading : isFetchingNextPage;

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (hasSearchQuery) {
      if (!canLoadMoreSearch || isSearchFetching) return;
      loadMoreSearch();
      return;
    }

    if (!infiniteScroll || !hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [
    hasSearchQuery,
    canLoadMoreSearch,
    isSearchFetching,
    loadMoreSearch,
    infiniteScroll,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  useEffect(() => {
    if (!infiniteScroll && !hasSearchQuery) return;

    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "150px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [infiniteScroll, hasSearchQuery, loadMore]);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  // ── Determine which rows are new (need animation) vs already-seen ───
  const searchKey = hasSearchQuery ? debouncedQuery : "__browse__";
  const isFirstBatchRef = useRef(true);

  if (searchKey !== lastSearchKey) {
    animatedIds = new Set<string>();
    lastSearchKey = searchKey;
    isFirstBatchRef.current = true;
  }

  const newIds: string[] = [];
  for (const skill of skills) {
    if (!animatedIds.has(skill.id)) {
      newIds.push(skill.id);
    }
  }

  useEffect(() => {
    if (!tableLoading && !tableError && newIds.length > 0) {
      for (const id of newIds) {
        animatedIds.add(id);
      }
      if (isFirstBatchRef.current) {
        isFirstBatchRef.current = false;
      }
    }
  });

  const getDescription = (skill: (typeof skills)[number]) => {
    if ("snippet" in skill && skill.snippet) {
      return skill.snippet;
    }

    return skill.description;
  };

  const getRowStyle = (skillId: string): React.CSSProperties => {
    const batchIndex = newIds.indexOf(skillId);
    if (batchIndex === -1) return {};
    const clampedIndex = Math.min(batchIndex, MAX_STAGGER_INDEX);
    const baseDelay = isFirstBatchRef.current ? INITIAL_BASE_DELAY_MS : 0;
    return {
      animation: `skillRowIn ${ANIMATION_DURATION_MS}ms ease-out both`,
      animationDelay: `${baseDelay + clampedIndex * STAGGER_DELAY_MS}ms`,
    };
  };

  return (
    <section id="skills">
      <style dangerouslySetInnerHTML={{ __html: ROW_ANIMATION_STYLE }} />

      <div className={cn("mx-auto", className)}>
        <div className="border border-border bg-background/90 backdrop-blur-sm">
          {/* Search */}
          {showSearch && (
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 focus-within:border-primary/50 transition-colors">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search skills…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  name="marketplace-search"
                  autoComplete="off"
                  aria-label="Search marketplace skills"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="font-mono">
            {/* Loading */}
            {tableLoading && (
              <div className="px-6 py-16 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading skills...</p>
              </div>
            )}

            {/* Error */}
            {tableError && (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-muted-foreground">Failed to load skills</p>
              </div>
            )}

            {/* Rows */}
            {!tableLoading &&
              !tableError &&
              skills.map((skill, index) => (
                <div
                  key={skill.id}
                  style={getRowStyle(skill.id)}
                  className="group flex items-center justify-between gap-4 border-b border-border px-5 py-2.5 transition-colors hover:bg-secondary/50"
                >
                  <span className="text-sm text-muted-foreground/50 tabular-nums shrink-0">
                    {index + 1}
                  </span>

                  <Link href={buildSkillHref(skill.id)} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                        {skill.name}
                      </span>
                      <span className="text-[10px] font-sans text-muted-foreground truncate">
                        {getDescription(skill)}
                      </span>
                    </div>
                  </Link>

                  <div className="flex shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => openAddSkillFlow(skill)}
                      className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:text-primary"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                </div>
              ))}

            {(infiniteScroll || hasSearchQuery) && !tableLoading && !tableError && (
              <div ref={sentinelRef} className="h-1" />
            )}

            {hasMoreResults && isFetchingMore && (
              <div className="border-b border-border px-6 py-6 text-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
              </div>
            )}

            {/* Empty state */}
            {!tableLoading && !tableError && skills.length === 0 && (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {search.trim() ? (
                    <>No skills matching &ldquo;{search}&rdquo;</>
                  ) : (
                    "No skills available yet"
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              {skills.length} skill{skills.length !== 1 ? "s" : ""}
              {hasSearchQuery ? (hasMoreResults ? "+" : "") : nextCursor ? "+" : ""}
            </span>
            {showViewAll && (
              <Link
                href="/skills"
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 transition-colors"
              >
                View all skills
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <AddSkillModal
        key={selectedSkill?.id ?? "none"}
        open={modalOpen}
        onClose={closeAddSkillFlow}
        initialSkill={selectedSkill}
      />
    </section>
  );
}
