"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { authClient } from "@/lib/auth-client";
import AddSkillModal from "@/app/(app)/dashboard/_components/add-skill-modal";
import type { SelectedSkill } from "@/app/(app)/dashboard/_hooks/use-modal-machine";

interface SkillsTableProps {
  limit?: number;
  showSearch?: boolean;
  showViewAll?: boolean;
  infiniteScroll?: boolean;
  className?: string;
}

export default function SkillsTable({
  limit,
  showSearch = true,
  showViewAll = true,
  infiniteScroll = false,
  className,
}: SkillsTableProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SelectedSkill | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const pageSize = limit ?? 50;

  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery(
      trpc.skills.list.infiniteQueryOptions(
        {
          limit: pageSize,
          search: search.trim() || undefined,
          visibility: "public",
        },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        },
      ),
    );

  const pages = data?.pages ?? [];
  const skills = pages.flatMap((page) => page.items);
  const nextCursor = pages.at(-1)?.nextCursor;

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!infiniteScroll || !hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [infiniteScroll, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!infiniteScroll) return;

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
  }, [infiniteScroll, loadMore]);

  const handleAdd = (skill: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  }) => {
    if (!session?.user) {
      router.push("/login?next=/skills");
      return;
    }
    setSelectedSkill({
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      description: skill.description ?? "",
    });
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedSkill(null);
  };

  return (
    <section id="skills" className={className ?? "py-24 px-6 md:px-16"}>
      <div className="max-w-[1280px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="border border-border"
        >
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
                  placeholder="Search skills ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
            <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em] text-right" />
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="border-t border-border px-6 md:px-8 py-16 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading skills...</p>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="border-t border-border px-6 md:px-8 py-16 text-center">
              <p className="text-sm text-muted-foreground">Failed to load skills</p>
            </div>
          )}

          {/* Rows */}
          {!isLoading &&
            !isError &&
            skills.map((skill, index) => {
              return (
                <Link
                  href={`/dashboard/skills/${skill.id}`}
                  className="text-sm font-semibold text-foreground group transition-colors"
                  key={skill.id}
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.03 * index }}
                    className="grid grid-cols-[48px_1fr_100px] md:grid-cols-[56px_1fr_120px] border-t border-border px-6 md:px-8 py-5 items-center hover:bg-secondary/50 transition-colors group-hover:text-primary"
                  >
                    {/* Rank */}
                    <span className="text-sm text-muted-foreground tabular-nums">{index + 1}</span>

                    {/* Skill name + slug */}
                    <div className="min-w-0 pr-4">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        {skill.name}
                        <span className="text-xs text-muted-foreground truncate">{skill.slug}</span>
                        {skill.visibility === "private" && (
                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5">
                            private
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 hidden md:block truncate">
                        {skill.description}
                      </p>
                    </div>

                    {/* Add button */}
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleAdd(skill);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border transition-all duration-150 border-border text-muted-foreground hover:text-primary hover:border-primary/40"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Add</span>
                      </button>
                    </div>
                  </motion.div>
                </Link>
              );
            })}

          {infiniteScroll && !isLoading && !isError && <div ref={sentinelRef} className="h-1" />}

          {infiniteScroll && isFetchingNextPage && (
            <div className="border-t border-border px-6 md:px-8 py-6 text-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-auto" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && skills.length === 0 && (
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
              {nextCursor ? "+" : ""}
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
        </motion.div>
      </div>

      <AddSkillModal
        key={selectedSkill?.id ?? "none"}
        open={modalOpen}
        onClose={handleModalClose}
        initialSkill={selectedSkill}
      />
    </section>
  );
}
