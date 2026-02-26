import type { Route } from "next";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { SkillDescription } from "@/components/skills/skill-description";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/format-display-date";

export function SkillEditHeader({
  slug,
  name,
  description,
  updatedAt,
  resourcesCount,
  hasChanges,
  isSaving,
  onNavigate,
  onSave,
  skillHref,
  dashboardHref,
}: {
  slug: string;
  name: string;
  description?: string | null;
  updatedAt: string | Date;
  resourcesCount: number;
  hasChanges: boolean;
  isSaving: boolean;
  onNavigate: (href: Route) => void;
  onSave: () => void;
  skillHref: Route;
  dashboardHref: Route;
}) {
  return (
    <header className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <button
            type="button"
            onClick={() => onNavigate(dashboardHref)}
            className="transition-colors duration-150 hover:text-foreground"
          >
            skills
          </button>
          <span className="text-border">/</span>
          <button
            type="button"
            onClick={() => onNavigate(skillHref)}
            className="transition-colors duration-150 text-foreground"
          >
            {slug}
          </button>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate(skillHref)}>
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {hasChanges ? "Discard changes" : "Exit"}
          </Button>
          <Button
            size="sm"
            className="border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            disabled={!hasChanges || isSaving}
            onClick={onSave}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="size-3.5" aria-hidden="true" />
            )}
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold leading-tight text-foreground text-balance break-words sm:text-3xl">
          {name}
        </h1>
        <SkillDescription description={description} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground font-mono">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block size-1.5 bg-amber-500" aria-hidden="true" />
          private
        </span>
        <span className="text-border">|</span>
        <span>
          {resourcesCount} resource
          {resourcesCount !== 1 ? "s" : ""}
        </span>
        <span className="text-border">|</span>
        <span>Updated {formatDisplayDate(updatedAt)}</span>
        {hasChanges && (
          <>
            <span className="text-border">|</span>
            <span className="text-amber-500">Unsaved changes</span>
          </>
        )}
      </div>
    </header>
  );
}
