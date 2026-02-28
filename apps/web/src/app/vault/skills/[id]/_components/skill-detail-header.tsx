import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { SkillDescription } from "@/components/skills/skill-description";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/format-display-date";
import { dashboardRoute } from "@/lib/skills/routes";

export function SkillDetailHeader({
  slug,
  name,
  description,
  isDefaultSkill,
  sourceIdentifier,
  sourceUrl,
  updatedAt,
  resourcesCount,
  canAddToVault,
  canManageSkill,
  onAddToVault,
  onDelete,
  onEdit,
  onSave,
  onDiscard,
  isEditing = false,
  hasChanges = false,
  isSaving = false,
  compact = false,
  viewingResource,
  showCompactActions = true,
}: {
  slug: string;
  name: string;
  description?: string | null;
  isDefaultSkill: boolean;
  sourceIdentifier?: string | null;
  sourceUrl?: string | null;
  updatedAt: string | Date;
  resourcesCount: number;
  canAddToVault: boolean;
  canManageSkill: boolean;
  onAddToVault: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
  isEditing?: boolean;
  hasChanges?: boolean;
  isSaving?: boolean;
  compact?: boolean;
  viewingResource?: string | null;
  showCompactActions?: boolean;
}) {
  const viewingResourceName = viewingResource
    ? (viewingResource.split("/").filter(Boolean).at(-1) ?? viewingResource)
    : null;

  if (compact) {
    return (
      <header className="space-y-5">
        <div className="space-y-2">
          <Link href={dashboardRoute} className="inline-flex w-fit">
            <Button
              variant="link"
              size="xs"
              className="h-6 p-0 font-mono text-[10px] text-muted-foreground hover:text-foreground"
              aria-label="Back to skills"
            >
              <ArrowLeft className="size-3" aria-hidden="true" />
              Back
            </Button>
          </Link>

          <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground font-mono">
            <Link
              href={dashboardRoute}
              className="shrink-0 transition-colors duration-150 hover:text-foreground"
            >
              skills
            </Link>
            <span className="shrink-0 text-border">/</span>
            <span
              className={
                viewingResourceName
                  ? "min-w-0 max-w-[34%] truncate whitespace-nowrap font-medium text-foreground"
                  : "min-w-0 truncate whitespace-nowrap font-medium text-foreground"
              }
            >
              {slug}
            </span>
            {viewingResourceName && (
              <>
                <span className="shrink-0 text-border">/</span>
                <span className="min-w-0 flex-1 truncate whitespace-nowrap text-foreground">
                  {viewingResourceName}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-semibold leading-tight text-foreground break-words">
            {name}
          </h1>
          <SkillDescription description={description} />

          <div className="flex items-center gap-2 pt-0.5">
            {isDefaultSkill && (
              <span className="inline-flex items-center border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                default
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="uppercase font-mono text-[10px] text-neutral-300 tracking-wider mb-2.5">
            Info
          </h3>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <FileText className="size-3" aria-hidden="true" />
                Resources
              </span>
              <span className="font-mono text-foreground">{resourcesCount}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-3" aria-hidden="true" />
                Updated
              </span>
              <span className="font-mono text-foreground">{formatDisplayDate(updatedAt)}</span>
            </div>
            {sourceIdentifier && (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Eye className="size-3" aria-hidden="true" />
                  Source
                </span>
                <span className="font-mono text-foreground truncate max-w-[140px]">
                  {sourceIdentifier}
                </span>
              </div>
            )}
            {sourceUrl && (
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                  Link
                </span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 font-mono text-primary transition-colors duration-150 hover:text-primary/80 truncate max-w-[140px]"
                >
                  source
                  <ArrowUpRight className="size-2.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
        </div>

        {showCompactActions && (canAddToVault || canManageSkill) && (
          <div className="flex items-center gap-3 pt-1">
            {canAddToVault && !isEditing && (
              <Button size="sm" className="w-full hover:bg-primary/90" onClick={onAddToVault}>
                Add to Vault
                <Plus className="size-3.5" />
              </Button>
            )}
            {canManageSkill &&
              (isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={onDiscard}>
                    Discard
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
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Edit skill"
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                    EDIT
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-red-400/70 transition-colors hover:text-red-400"
                    aria-label="Delete skill"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                    DELETE
                  </button>
                </>
              ))}
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <Link
            href={dashboardRoute}
            className="transition-colors duration-150 hover:text-foreground"
          >
            skills
          </Link>
          <span className="text-border">/</span>
          <span className="truncate font-medium text-foreground">{slug}</span>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {canAddToVault && !isEditing && (
            <Button size="default" className="hover:bg-primary/90" onClick={onAddToVault}>
              Add to Vault
              <Plus className="size-3.5" />
            </Button>
          )}
          {canManageSkill &&
            (isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={onDiscard}>
                  Discard
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
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Edit skill"
                >
                  <Pencil className="size-3" aria-hidden="true" />
                  EDIT
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-red-400/70 transition-colors hover:text-red-400"
                  aria-label="Delete skill"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                  DELETE
                </button>
              </>
            ))}
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold leading-tight text-foreground text-balance break-words sm:text-3xl">
          {name}
        </h1>
        <SkillDescription description={description} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground font-mono">
        {isDefaultSkill && (
          <>
            <span>default skill</span>
            <span className="text-border">|</span>
          </>
        )}
        <span>
          {resourcesCount} resource{resourcesCount !== 1 ? "s" : ""}
        </span>
        <span className="text-border">|</span>
        <span>Updated {formatDisplayDate(updatedAt)}</span>
        {sourceIdentifier && (
          <>
            <span className="text-border">|</span>
            <span>{sourceIdentifier}</span>
          </>
        )}
        {sourceUrl && (
          <>
            <span className="text-border">|</span>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary transition-colors duration-150 hover:text-primary/80"
            >
              Source
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </a>
          </>
        )}
      </div>
    </header>
  );
}
