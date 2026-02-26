"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Loader2, MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { buildSkillEditHref, buildSkillHref } from "@/lib/skills/routes";
import { trpc } from "@/lib/api/trpc";
import { cn } from "@/lib/utils";

interface MySkillsTableProps {
  onDelete: (skillId: string, skillName: string) => void;
  height?: number;
  className?: string;
}

export default function MySkillsTable({ onDelete, height, className }: MySkillsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery(
    trpc.skills.list.queryOptions({
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
      {/* <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-background">
        <Hexagon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-mono uppercase text-muted-foreground">My Vault</span>
      </div> */}

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
        {/* <div className="grid grid-cols-[40px_1fr_56px] px-6 py-3">
          <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">#</span>
          <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em]">
            SKILL
          </span>
          <span className="text-[11px] text-muted-foreground uppercase tracking-[0.06em] text-right">
            ACTIONS
          </span>
        </div> */}

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
            <div
              key={skill.id}
              className="flex justify-between gap-6 items-center border-b border-border px-6 py-2 transition-colors hover:bg-secondary/50 group"
            >
              <span className="text-sm text-neutral-300 tabular-nums">{index + 1}</span>

              <Link href={buildSkillHref(skill.id)} className="min-w-0 w-full">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {skill.name}
                  </span>
                  <span className="text-[10px] font-sans text-muted-foreground transition-colors truncate">
                    {skill.description}
                  </span>
                </div>
              </Link>

              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Actions for ${skill.name}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(buildSkillHref(skill.id))}>
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={skill.isDefault}
                      onClick={() => {
                        if (!skill.isDefault) {
                          router.push(buildSkillEditHref(skill.id));
                        }
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={skill.isDefault}
                      onClick={() => {
                        if (!skill.isDefault) {
                          onDelete(skill.id, skill.name);
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
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
