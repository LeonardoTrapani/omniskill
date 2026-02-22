"use client";

import { useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Search, MoreHorizontal, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";

interface MyOmniTableProps {
  onDelete: (skillId: string, skillName: string) => void;
  height?: number;
  className?: string;
}

export default function MyOmniTable({ onDelete, height, className }: MyOmniTableProps) {
  const router = useRouter();
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
      className={cn("border border-border flex flex-col min-h-0", className)}
      style={height ? { height } : undefined}
    >
      {/* Title */}
      <div className="px-6 md:px-8 pt-8 pb-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
          MY VAULT
        </h2>
      </div>

      {/* Search */}
      <div className="px-6 md:px-8 pb-6">
        <div className="flex items-center gap-3 border border-border px-4 py-3 focus-within:border-primary/50 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search your skills ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[48px_1fr_100px] md:grid-cols-[56px_1fr_120px] border-t border-border px-6 md:px-8 py-3">
        <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">#</span>
        <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">SKILL</span>
        <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em] text-right">
          ACTIONS
        </span>
      </div>

      <div className={cn("min-h-0", height ? "flex-1 overflow-y-auto" : "")}>
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
          skills.map((skill, index) => (
            <div
              key={skill.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/dashboard/skills/${skill.id}` as Route)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/dashboard/skills/${skill.id}` as Route);
                }
              }}
              className="grid grid-cols-[48px_1fr_100px] md:grid-cols-[56px_1fr_120px] border-t border-border px-6 md:px-8 py-5 items-center hover:bg-secondary/50 transition-colors group cursor-pointer"
            >
              {/* Rank */}
              <span className="text-sm text-muted-foreground tabular-nums">{index + 1}</span>

              {/* Skill name + slug */}
              <div className="min-w-0 pr-4">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {skill.name}
                  </span>
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

              {/* Actions */}
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-xs" aria-label="Skill actions">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/skills/${skill.id}` as Route)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/skills/${skill.id}/edit` as Route)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onDelete(skill.id, skill.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

        {/* Empty state */}
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

      {/* Footer */}
      <div className="border-t border-border px-6 md:px-8 py-4">
        <span className="text-xs text-muted-foreground">
          {skills.length} skill{skills.length !== 1 ? "s" : ""}
          {data?.nextCursor ? "+" : ""}
        </span>
      </div>
    </div>
  );
}
