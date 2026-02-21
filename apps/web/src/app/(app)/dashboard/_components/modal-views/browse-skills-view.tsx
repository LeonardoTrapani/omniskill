"use client";

import { useState, useRef, useCallback, useEffect, type Dispatch } from "react";
import { Search, Plus, Loader2 } from "lucide-react";

import type { SelectedSkill } from "../../_hooks/use-modal-machine";

type ModalAction = { type: "SELECT_SKILL"; skill: SelectedSkill };

interface BrowseSkillsViewProps {
  dispatch: Dispatch<ModalAction>;
}

// TODO: Connect backend — replace mock data with real tRPC infinite query:
//   useInfiniteQuery(trpc.skills.list.infiniteQueryOptions(
//     { limit: 10, search },
//     { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined }
//   ))
// The backend already supports cursor pagination via `nextCursor`.

interface MockSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
}

const MOCK_SKILLS: MockSkill[] = Array.from({ length: 42 }, (_, i) => ({
  id: `skill-${i + 1}`,
  name: `Skill ${i + 1}`,
  slug: `skill-${i + 1}`,
  description: `This is the description for skill number ${i + 1}. Connect backend to show real data.`,
}));

const PAGE_SIZE = 10;

export default function BrowseSkillsView({ dispatch }: BrowseSkillsViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingInitial(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Reset pagination on search change
  useEffect(() => {
    setPage(1);
  }, [search]);

  // TODO: Replace this filtering with the real tRPC search query
  const filtered = search.trim()
    ? MOCK_SKILLS.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : MOCK_SKILLS;

  const skills = filtered.slice(0, page * PAGE_SIZE);
  const hasNextPage = skills.length < filtered.length;

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isLoadingMore) return;
    setIsLoadingMore(true);
    // TODO: Replace with fetchNextPage() from useInfiniteQuery
    setTimeout(() => {
      setPage((p) => p + 1);
      setIsLoadingMore(false);
    }, 300);
  }, [hasNextPage, isLoadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="flex flex-col gap-4 py-2">
      {/* Search */}
      <div className="flex items-center gap-3 border border-border px-4 py-3 focus-within:border-primary/50 transition-colors">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search public skills ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          autoFocus
        />
      </div>

      {/* List */}
      <div className="border border-border max-h-[50vh] overflow-y-auto">
        {isLoadingInitial && (
          <div className="py-12 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading skills...</p>
          </div>
        )}

        {!isLoadingInitial && skills.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {search.trim() ? (
                <>No skills matching &ldquo;{search}&rdquo;</>
              ) : (
                "No public skills available"
              )}
            </p>
          </div>
        )}

        {!isLoadingInitial &&
          skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
            >
              <div className="min-w-0 pr-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">{skill.name}</span>
                  <span className="text-xs text-muted-foreground truncate">{skill.slug}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {skill.description}
                </p>
              </div>
              <button
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-all duration-150 flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Add</span>
              </button>
            </div>
          ))}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />

        {isLoadingMore && (
          <div className="py-4 text-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
