"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  FileText,
  Info,
  Loader2,
  Network,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { AddSkillModal } from "@/features/dashboard";
import { ForceGraph } from "@/features/skills/components/graph/force-graph";
import { createMarkdownComponents } from "@/features/skills/components/markdown-components";
import { markdownUrlTransform } from "@/features/skills/components/markdown-url-transform";
import { GraphFill } from "@/features/skills/components/graph-fill";
import { SkillPanel } from "@/features/skills/components/skill-panel";
import { useAddSkillFlow } from "@/features/skills/hooks/use-add-skill-flow";
import { useClampedDescription } from "@/features/skills/hooks/use-clamped-description";
import { invalidateSkillCollectionQueries } from "@/features/skills/lib/invalidate-skill-queries";
import { createResourceHrefResolver } from "@/features/skills/lib/resource-links";
import { buildSkillEditHref, dashboardRoute } from "@/features/skills/lib/routes";
import { ResourceHoverLink } from "@/features/skills/components/resource-link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate } from "@/shared/lib/format-display-date";
import { trpc } from "@/shared/api/trpc";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function jsonEntries(value: Record<string, unknown>) {
  return Object.entries(value).slice(0, 12);
}

function displayValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function SkillDetail({ id }: { id: string }) {
  const router = useRouter();
  const { session, selectedSkill, modalOpen, openAddSkillFlow, closeAddSkillFlow } =
    useAddSkillFlow({ loginNext: `/dashboard/skills/${id}` });
  const { data, isLoading, isError } = useQuery(
    trpc.skills.getById.queryOptions({ id, linkMentions: true }),
  );
  const graphQuery = useQuery(trpc.skills.graphForSkill.queryOptions({ skillId: id }));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const {
    contentRef: descriptionRef,
    expanded: descriptionExpanded,
    setExpanded: setDescriptionExpanded,
    hasOverflow: hasDescriptionOverflow,
  } = useClampedDescription(data?.description);

  const deleteMutation = useMutation(
    trpc.skills.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateSkillCollectionQueries(id);
        toast.success(`"${data?.name ?? "Skill"}" has been deleted`);
        setDeleteDialogOpen(false);
        router.push(dashboardRoute);
      },
      onError: (error) => {
        toast.error(`Failed to delete skill: ${error.message}`);
      },
    }),
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  const frontmatter = useMemo(() => (data ? jsonEntries(data.frontmatter) : []), [data]);
  const metadata = useMemo(() => (data ? jsonEntries(data.metadata) : []), [data]);
  const resources = data?.resources ?? [];
  const findResourceByHref = useMemo(() => createResourceHrefResolver(resources), [resources]);

  const skillId = data?.id ?? id;
  const isOwnedByViewer = data?.ownerUserId != null && data.ownerUserId === session?.user?.id;
  const isDefaultSkill = data?.isDefault ?? false;
  const canManageSkill = data?.visibility === "private" && isOwnedByViewer && !isDefaultSkill;
  const canAddToVault = data?.visibility === "public" && !isOwnedByViewer;

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: data?.name,
        findResourceByHref,
      }),
    [data?.name, skillId, findResourceByHref],
  );

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-4 w-[560px]" />
          </div>
          <Separator />
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---- Error ---- */
  if (isError || !data) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 py-32">
          <p className="text-sm text-muted-foreground">
            The requested skill is not accessible or does not exist.
          </p>
          <Link href={dashboardRoute}>
            <Button variant="outline" size="sm">
              Back to Skills
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  /* Merge frontmatter + metadata for the details panel */
  const allDataEntries = [...frontmatter, ...metadata];

  return (
    <main className="relative min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />

      <div className="relative mx-auto max-w-7xl">
        {/* ============================================================ */}
        {/*  HEADER                                                       */}
        {/* ============================================================ */}
        <header className="space-y-5 pb-8">
          {/* Top bar: nav + actions */}
          <div className="flex items-center justify-between gap-4">
            <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link
                href={dashboardRoute}
                className="transition-colors duration-150 hover:text-foreground"
              >
                skills
              </Link>
              <span className="text-border">/</span>
              <span className="truncate text-foreground">{data.slug}</span>
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              {canAddToVault && (
                <Button
                  size="default"
                  className="hover:bg-primary/90"
                  onClick={() => openAddSkillFlow(data)}
                >
                  Add to Vault
                  <Plus className="size-3.5" />
                </Button>
              )}
              {canManageSkill && (
                <>
                  <Link href={buildSkillEditHref(data.id)}>
                    <Button variant="outline" size="sm" aria-label="Edit skill">
                      <Pencil className="size-3.5" aria-hidden="true" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    aria-label="Delete skill"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Title + description */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-tight text-foreground text-balance break-words sm:text-3xl">
              {data.name}
            </h1>
            {data.description && (
              <div>
                <p
                  ref={descriptionRef}
                  className={[
                    "text-sm leading-relaxed text-muted-foreground break-words text-pretty",
                    descriptionExpanded
                      ? ""
                      : "[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {data.description}
                </p>
                {hasDescriptionOverflow && (
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-primary transition-colors duration-150 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    onClick={() => setDescriptionExpanded((prev) => !prev)}
                    aria-label={descriptionExpanded ? "Collapse description" : "Expand description"}
                  >
                    {descriptionExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span
                className={`inline-block size-1.5 ${data.visibility === "public" ? "bg-emerald-500" : "bg-amber-500"}`}
                aria-hidden="true"
              />
              {data.visibility}
            </span>
            {isDefaultSkill && (
              <>
                <span className="text-border">|</span>
                <span>default skill</span>
              </>
            )}
            <span className="text-border">|</span>
            <span>
              {data.resources.length} resource{data.resources.length !== 1 ? "s" : ""}
            </span>
            <span className="text-border">|</span>
            <span>Updated {formatDisplayDate(data.updatedAt)}</span>
            {data.sourceIdentifier && (
              <>
                <span className="text-border">|</span>
                <span>{data.sourceIdentifier}</span>
              </>
            )}
            {data.sourceUrl && (
              <>
                <span className="text-border">|</span>
                <a
                  href={data.sourceUrl}
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

        <Separator className="mb-8" />

        {/* ============================================================ */}
        {/*  BODY: content + sidebar                                      */}
        {/* ============================================================ */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* ---- Main column ---- */}
          <div className="min-w-0 space-y-6">
            {/* Mobile graph toggle */}
            <div className="lg:hidden">
              <SkillPanel
                icon={<Network className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Skill Graph"
                collapsible
                defaultOpen={false}
              >
                <div>
                  {graphQuery.isLoading && (
                    <div className="flex h-[320px] items-center justify-center">
                      <Loader2
                        className="size-4 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  {graphQuery.isError && (
                    <div className="flex h-[320px] items-center justify-center">
                      <p className="text-xs text-muted-foreground">Failed to load graph</p>
                    </div>
                  )}
                  {graphQuery.data && (
                    <ForceGraph data={graphQuery.data} focusNodeId={id} height={360} />
                  )}
                </div>
              </SkillPanel>
            </div>

            {/* SKILL.md panel */}
            <SkillPanel
              icon={<FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />}
              title="SKILL.md"
            >
              <div className="md:p-8 p-6">
                <article className="min-w-0 break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                    urlTransform={markdownUrlTransform}
                  >
                    {data.renderedMarkdown || data.originalMarkdown}
                  </ReactMarkdown>
                </article>
              </div>
            </SkillPanel>

            {/* Frontmatter + metadata panel */}
            <SkillPanel
              icon={<Info className="size-3.5 text-muted-foreground" aria-hidden="true" />}
              title="Skill Data"
              trailing={
                <span className="text-[10px] text-muted-foreground">
                  {allDataEntries.length} field{allDataEntries.length !== 1 ? "s" : ""}
                </span>
              }
              collapsible
              defaultOpen={allDataEntries.length > 0}
              isEmpty={allDataEntries.length === 0}
            >
              <div className="px-5 py-4">
                {allDataEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data fields.</p>
                ) : (
                  <div className="space-y-4">
                    {/* Frontmatter */}
                    {frontmatter.length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                          Frontmatter
                        </p>
                        <div className="space-y-1.5">
                          {frontmatter.map(([key, value]) => (
                            <div key={key} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-3">
                              <p className="text-[11px] text-muted-foreground break-words">{key}</p>
                              <p className="text-xs text-foreground break-words">
                                {displayValue(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SkillPanel>

            {/* Resources panel */}
            <SkillPanel
              icon={<Paperclip className="size-3.5 text-muted-foreground" aria-hidden="true" />}
              title="Resources"
              trailing={
                <span className="text-[10px] text-muted-foreground">
                  {data.resources.length} file{data.resources.length !== 1 ? "s" : ""}
                </span>
              }
              collapsible
              defaultOpen={data.resources.length > 0}
              isEmpty={data.resources.length === 0}
            >
              <div>
                {data.resources.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-muted-foreground">No resources attached.</p>
                ) : (
                  <div>
                    {data.resources.map((resource, idx) => (
                      <div
                        key={resource.id}
                        className={`flex items-center justify-between gap-3 px-5 py-2.5 ${
                          idx < data.resources.length - 1 ? "border-b border-border/40" : ""
                        }`}
                      >
                        <ResourceHoverLink
                          resource={resource}
                          skillId={data.id}
                          skillName={data.name}
                          className="min-w-0 break-all text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {resource.path}
                        </ResourceHoverLink>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {resource.kind}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SkillPanel>
          </div>

          {/* ---- Sidebar ---- */}
          <aside className="hidden min-w-0 lg:block lg:h-full">
            <div className="flex h-full flex-col gap-6">
              {/* Graph panel -- fills remaining space */}
              <SkillPanel
                icon={<Network className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Skill Graph"
                className="sticky top-[68px] flex h-[calc(100dvh-92px)] min-h-0 flex-col"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {graphQuery.isLoading && (
                    <div className="flex h-full items-center justify-center">
                      <Loader2
                        className="size-4 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  {graphQuery.isError && (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-xs text-muted-foreground">Failed to load graph</p>
                    </div>
                  )}
                  {graphQuery.data && <GraphFill data={graphQuery.data} focusNodeId={id} />}
                </div>
              </SkillPanel>
            </div>
          </aside>
        </div>
      </div>

      {/* ---- Dialogs ---- */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{data.name}&rdquo;? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: data.id })}
            >
              {deleteMutation.isPending ? "Deleting\u2026" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddSkillModal
        key={selectedSkill?.id ?? "none"}
        open={modalOpen}
        onClose={closeAddSkillFlow}
        initialSkill={selectedSkill}
      />
    </main>
  );
}
