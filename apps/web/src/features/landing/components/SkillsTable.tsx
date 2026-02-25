"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, ArrowRight, Loader2 } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { useAddSkillFlow } from "@/features/skills/hooks/use-add-skill-flow";
import { buildSkillHref } from "@/features/skills/lib/routes";
import { useSkillSearch } from "@/features/skills/hooks/use-skill-search";
import { trpc } from "@/shared/api/trpc";
import { cn } from "@/shared/lib/utils";
import { AddSkillModal } from "@/features/dashboard";

/* ── Row reveal animation ──────────────────────────────────────────── */
const ROW_ANIMATION_STYLE = `
@keyframes skillRowIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
` as const;

/** Max items that get an incremental stagger per batch — the rest appear at the same time */
const MAX_STAGGER_INDEX = 20;
/** Delay between each row within a batch */
const STAGGER_DELAY_MS = 35;
/** Duration of each row's fade-in */
const ANIMATION_DURATION_MS = 300;
/** Extra base delay for the very first batch so the table shell animates in first (matches the container motion duration) */
const INITIAL_BASE_DELAY_MS = 400;

/**
 * Module-level set of skill IDs that have already been animated.
 * Survives React re-mounts (e.g. back-navigation) so rows don't re-animate.
 * Cleared when the search query changes.
 */
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

  // Reset the animated set when the data source changes
  if (searchKey !== lastSearchKey) {
    animatedIds = new Set<string>();
    lastSearchKey = searchKey;
    isFirstBatchRef.current = true;
  }

  // Build the list of new (un-animated) IDs for this render in order
  const newIds: string[] = [];
  for (const skill of skills) {
    if (!animatedIds.has(skill.id)) {
      newIds.push(skill.id);
    }
  }

  // After layout, mark them as animated so future renders skip them
  useEffect(() => {
    if (!tableLoading && !tableError && newIds.length > 0) {
      for (const id of newIds) {
        animatedIds.add(id);
      }
      // After the first batch has been committed, clear the flag
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

  /**
   * For each row:
   * - Already animated on a previous render → no animation, renders instantly.
   * - New row → fade-in with a stagger delay relative to its position within
   *   the new batch (not the global list index). Capped so large loads stay fast.
   * - First batch adds a base delay so the table shell can animate in first.
   */
  const getRowStyle = (skillId: string): React.CSSProperties => {
    const batchIndex = newIds.indexOf(skillId);
    // Already seen — render instantly
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
      {/* Inject keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: ROW_ANIMATION_STYLE }} />

      <div className={cn("mx-auto", className)}>
        <div className="border border-border bg-background/95 backdrop-blur-sm">
          {/* Title */}
          <div className="px-6 md:px-8 pt-8 pb-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
              SKILLS MARKETPLACE
            </h2>
          </div>

          {/* Search */}
          {showSearch && (
            <div className="px-6 md:px-8 pb-6">
              <div className="flex items-center gap-3 border border-border px-4 py-3 focus-within:border-primary/50 transition-colors">
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

          {/* Table Header */}
          <div className="grid grid-cols-[48px_1fr_100px] md:grid-cols-[56px_1fr_120px] border-t border-border px-6 md:px-8 py-3">
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">#</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
              SKILL
            </span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em] text-right">
              ACTIONS
            </span>
          </div>

          {/* Loading */}
          {tableLoading && (
            <div className="border-t border-border px-6 md:px-8 py-16 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading skills...</p>
            </div>
          )}

          {/* Error */}
          {tableError && (
            <div className="border-t border-border px-6 md:px-8 py-16 text-center">
              <p className="text-sm text-muted-foreground">Failed to load skills</p>
            </div>
          )}

          {/* Rows */}
          {!tableLoading &&
            !tableError &&
            skills.map((skill, index) => {
              return (
                <div
                  key={skill.id}
                  style={getRowStyle(skill.id)}
                  className="group grid grid-cols-[48px_1fr_100px] items-center border-t border-border px-6 py-5 transition-colors hover:bg-secondary/50 md:grid-cols-[56px_1fr_120px] md:px-8"
                >
                  <span className="text-sm text-muted-foreground tabular-nums">{index + 1}</span>

                  <Link
                    href={buildSkillHref(skill.id)}
                    className="min-w-0 pr-4 text-sm font-semibold text-foreground"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 transition-colors group-hover:text-primary">
                      {skill.name}
                    </div>
                    <p className="mt-1 hidden truncate text-xs font-normal text-muted-foreground md:block">
                      {getDescription(skill)}
                    </p>
                  </Link>

                  <div className="flex justify-end">
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
              );
            })}

          {(infiniteScroll || hasSearchQuery) && !tableLoading && !tableError && (
            <div ref={sentinelRef} className="h-1" />
          )}

          {hasMoreResults && isFetchingMore && (
            <div className="border-t border-border px-6 md:px-8 py-6 text-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
            </div>
          )}

          {/* Empty state */}
          {!tableLoading && !tableError && skills.length === 0 && (
            <div className="border-t border-border px-6 md:px-8 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {search.trim() ? (
                  <>No skills matching &ldquo;{search}&rdquo;</>
                ) : (
                  "No skills available yet"
                )}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-border px-6 md:px-8 py-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
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
