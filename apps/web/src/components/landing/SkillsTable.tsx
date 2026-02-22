"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

interface SkillsTableProps {
  limit?: number;
  showSearch?: boolean;
  showViewAll?: boolean;
  className?: string;
}

export default function SkillsTable({
  limit,
  showSearch = true,
  showViewAll = true,
  className,
}: SkillsTableProps) {
  const [search, setSearch] = useState("");
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery(
    trpc.skills.list.queryOptions({
      limit: limit ?? 50,
      search: search.trim() || undefined,
    }),
  );

  const skills = data?.items ?? [];

  const handleAdd = (id: string) => {
    setAddedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
                <kbd className="hidden sm:flex items-center justify-center w-6 h-6 border border-border text-[11px] text-muted-foreground">
                  /
                </kbd>
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
              const isAdded = addedSkills.has(skill.id);
              return (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.03 * index }}
                  className="grid grid-cols-[48px_1fr_100px] md:grid-cols-[56px_1fr_120px] border-t border-border px-6 md:px-8 py-5 items-center hover:bg-secondary/50 transition-colors group"
                >
                  {/* Rank */}
                  <span className="text-sm text-muted-foreground tabular-nums">{index + 1}</span>

                  {/* Skill name + slug */}
                  <div className="min-w-0 pr-4">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        href={`/dashboard/skills/${skill.id}`}
                        className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                      >
                        {skill.name}
                      </Link>
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
                      onClick={() => handleAdd(skill.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border transition-all duration-150 ${
                        isAdded
                          ? "border-primary/40 text-primary bg-primary/10"
                          : "border-border text-muted-foreground hover:text-primary hover:border-primary/40"
                      }`}
                    >
                      {isAdded ? (
                        "Added"
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline">Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}

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
              {data?.nextCursor ? "+" : ""}
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
    </section>
  );
}
