"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { buildSkillHref } from "@/lib/skills/routes";
import { trpc } from "@/lib/api/trpc";
import { cn } from "@/lib/utils";

interface MySkillsTableProps {
  height?: number;
  className?: string;
}

export default function MySkillsTable({ height, className }: MySkillsTableProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery(
    trpc.skills.listByOwner.queryOptions({
      limit: 50,
      search: search.trim() || undefined,
    }),
  );

  const skills = data?.items ?? [];

  return (
    <div
      className={cn(
        "border border-border bg-background/90 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden",
        className,
      )}
      style={height ? { height } : undefined}
    >
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2 bg-background focus-within:border-primary/50 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search your skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="skills-search"
            autoComplete="off"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            aria-label="Search your skills"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto font-mono">
        {isLoading && (
          <div className="border-t border-border px-6 md:px-8 py-16 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading skills...</p>
          </div>
        )}

        {isError && (
          <div className="border-t border-border px-6 md:px-8 py-16 text-center">
            <p className="text-sm text-muted-foreground">Failed to load skills</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          skills.map((skill, index) => (
            <Link
              key={skill.id}
              href={buildSkillHref(skill.id)}
              className="flex gap-6 items-center border-b border-border px-6 py-2 transition-colors hover:bg-secondary/50 group"
            >
              <span className="text-sm text-neutral-300 tabular-nums">{index + 1}</span>

              <div className="min-w-0 w-full flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {skill.name}
                </span>
                <span className="text-[10px] font-sans text-muted-foreground transition-colors truncate">
                  {skill.description}
                </span>
              </div>
            </Link>
          ))}

        {!isLoading && !isError && skills.length === 0 && (
          <div className="border-t border-border px-6 md:px-8 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {search.trim() ? (
                <>No skills matching &ldquo;{search}&rdquo;</>
              ) : (
                "You don't have any skills yet"
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
