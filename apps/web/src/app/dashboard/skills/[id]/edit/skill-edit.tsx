"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";

import MarkdownEditorLazy from "@/components/skills/markdown-editor-lazy";
import MentionPopover from "@/components/skills/mention-popover";
import {
  editorMarkdownToStorageMarkdown,
  storageMarkdownToEditorMarkdown,
} from "@/components/skills/mention-markdown";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { useClampedDescription } from "@/hooks/use-clamped-description";
import { useMentionAutocomplete, type MentionItem } from "@/hooks/use-mention-autocomplete";
import { ResourceHoverLink } from "@/components/skills/resource-link";
import { authClient } from "@/lib/auth-client";
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
import { queryClient, trpc } from "@/utils/trpc";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function replaceLastOccurrence(input: string, search: string, replacement: string) {
  const index = input.lastIndexOf(search);
  if (index === -1) return input;
  return `${input.slice(0, index)}${replacement}${input.slice(index + search.length)}`;
}

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/*  Reusable bordered panel matching the skill-detail design           */
/* ------------------------------------------------------------------ */
function Panel({
  icon,
  title,
  trailing,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-border bg-background/90 backdrop-blur-sm ${className ?? ""}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
            {title}
          </h2>
        </div>
        {trailing && <div className="flex items-center gap-2">{trailing}</div>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function SkillEdit({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data, isLoading, isError } = useQuery(trpc.skills.getById.queryOptions({ id }));

  const editorRef = useRef<MDXEditorMethods>(null);
  const hasMountedRef = useRef(false);
  const initialMarkdownRef = useRef("");
  const [hasChanges, setHasChanges] = useState(false);

  /* ---- Unsaved-changes navigation guard ---- */
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const guardedNavigate = useCallback(
    (href: string) => {
      if (hasChanges) {
        setPendingHref(href);
      } else {
        router.push(href as Route);
      }
    },
    [hasChanges, router],
  );

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) {
      router.push(href as Route);
    }
  }, [pendingHref, router]);

  /* Warn on browser tab close / refresh */
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);
  const {
    contentRef: descriptionRef,
    expanded: descriptionExpanded,
    setExpanded: setDescriptionExpanded,
    hasOverflow: hasDescriptionOverflow,
  } = useClampedDescription(data?.description);

  const editorMarkdown = useMemo(
    () =>
      data
        ? storageMarkdownToEditorMarkdown({
            originalMarkdown: data.originalMarkdown || "",
            renderedMarkdown: data.renderedMarkdown,
          })
        : "",
    [data],
  );

  useEffect(() => {
    hasMountedRef.current = true;
    return () => {
      hasMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    initialMarkdownRef.current = editorMarkdown;
    setHasChanges(false);
  }, [data, editorMarkdown]);

  const saveMutation = useMutation(
    trpc.skills.update.mutationOptions({
      onSuccess: () => {
        const currentMarkdown = editorRef.current?.getMarkdown();
        if (currentMarkdown != null) {
          initialMarkdownRef.current = currentMarkdown;
        }
        queryClient.invalidateQueries({
          queryKey: trpc.skills.getById.queryKey({ id }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.skills.listByOwner.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.skills.graph.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.skills.graphForSkill.queryKey(),
        });
        setHasChanges(false);
        toast.success("Skill saved successfully");
        router.push(`/dashboard/skills/${id}` as Route);
      },
      onError: (error) => {
        toast.error(`Failed to save: ${error.message}`);
      },
    }),
  );

  const handleSave = useCallback(() => {
    const markdown = editorRef.current?.getMarkdown();
    if (markdown == null) return;
    saveMutation.mutate({
      id,
      skillMarkdown: editorMarkdownToStorageMarkdown(markdown),
    });
  }, [id, saveMutation]);

  const handleChange = useCallback(() => {
    if (!hasMountedRef.current) return;
    const currentMarkdown = editorRef.current?.getMarkdown();
    if (currentMarkdown == null) return;
    setHasChanges(currentMarkdown !== initialMarkdownRef.current);
  }, []);

  /* ---- Mention autocomplete ---- */
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const handleMentionInsert = useCallback(
    (item: MentionItem, mentionRange: Range, query: string) => {
      // Build a friendly markdown link for display in the editor
      const linkText =
        item.type === "skill"
          ? `[${item.label}](skill://${item.id})`
          : `[${item.label}](resource://${item.id})`;

      const currentMarkdown = editorRef.current?.getMarkdown();
      if (currentMarkdown == null) return;

      const rawTrigger = `[[${query}`;
      const escapedTrigger = `\\[\\[${query}`;

      // Replace the active mention trigger in markdown directly so the editor
      // immediately shows the final link without leaving `[[query` behind.
      let updatedMarkdown = replaceLastOccurrence(currentMarkdown, escapedTrigger, linkText);
      if (updatedMarkdown === currentMarkdown) {
        updatedMarkdown = replaceLastOccurrence(currentMarkdown, rawTrigger, linkText);
      }

      if (updatedMarkdown !== currentMarkdown) {
        editorRef.current?.setMarkdown(updatedMarkdown);
        setHasChanges(updatedMarkdown !== initialMarkdownRef.current);
        return;
      }

      editorRef.current?.focus(undefined, { preventScroll: true });

      // Restore selection to the full `[[query` range and let MDXEditor
      // replace it through its public API (Lexical-safe update).
      const selection = window.getSelection();
      if (selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(mentionRange);
        } catch {
          // If the DOM range became stale, fall back to current caret insertion.
        }
      }

      editorRef.current?.insertMarkdown(linkText);

      const afterInsertMarkdown = editorRef.current?.getMarkdown();
      if (afterInsertMarkdown != null) {
        setHasChanges(afterInsertMarkdown !== initialMarkdownRef.current);
      }
    },
    [],
  );

  const mention = useMentionAutocomplete({
    skillId: data?.id ?? id,
    editorContainerRef,
    onInsert: handleMentionInsert,
  });

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
            <Skeleton className="h-[600px] w-full" />
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
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
          <Link href={"/dashboard" as Route}>
            <Button variant="outline" size="sm">
              Back to Skills
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const isOwnedByViewer = data.ownerUserId != null && data.ownerUserId === session?.user?.id;
  const canEditSkill = data.visibility === "private" && isOwnedByViewer;

  /* ---- Not editable ---- */
  if (!canEditSkill) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-4 py-32">
          <p className="text-sm text-muted-foreground">
            Editing is only available for your private skills. Import this skill into your vault
            first.
          </p>
          <Link href={`/dashboard/skills/${data.id}` as Route}>
            <Button variant="outline" size="sm">
              Back to Skill
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const markdownContent = editorMarkdown;

  return (
    <main className="relative min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
      {/* Edit mode accent bar */}
      {/* <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-amber-500" /> */}

      {/* Decorative background - amber-tinted grid for edit mode */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />
      {/* <div className="pointer-events-none absolute inset-0 bg-amber-500/[0.01]" /> */}

      <div className="relative mx-auto max-w-7xl">
        {/* ============================================================ */}
        {/*  HEADER                                                       */}
        {/* ============================================================ */}
        <header className="space-y-5 pb-8">
          {/* Top bar: nav + actions */}
          <div className="flex items-center justify-between gap-4">
            <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <button
                type="button"
                onClick={() => guardedNavigate("/dashboard")}
                className="transition-colors duration-150 hover:text-foreground"
              >
                skills
              </button>
              <span className="text-border">/</span>
              <button
                type="button"
                onClick={() => guardedNavigate(`/dashboard/skills/${data.id}`)}
                className="transition-colors duration-150 text-foreground"
              >
                {data.slug}
              </button>
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => guardedNavigate(`/dashboard/skills/${data.id}`)}
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {hasChanges ? "Discard changes" : "Exit"}
              </Button>
              <Button
                size="sm"
                className="border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                disabled={!hasChanges || saveMutation.isPending}
                onClick={handleSave}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-3.5" aria-hidden="true" />
                )}
                {saveMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          {/* Title + description */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold leading-tight text-foreground text-balance break-words sm:text-3xl">
                {data.name}
              </h1>
            </div>
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
              <span className="inline-block size-1.5 bg-amber-500" aria-hidden="true" />
              private
            </span>
            <span className="text-border">|</span>
            <span>
              {data.resources.length} resource
              {data.resources.length !== 1 ? "s" : ""}
            </span>
            <span className="text-border">|</span>
            <span>Updated {formatDate(data.updatedAt)}</span>
            {hasChanges && (
              <>
                <span className="text-border">|</span>
                <span className="text-amber-500">Unsaved changes</span>
              </>
            )}
          </div>
        </header>

        <Separator className="mb-8" />

        {/* ============================================================ */}
        {/*  BODY: editor + sidebar                                       */}
        {/* ============================================================ */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* ---- Main column: editor ---- */}
          <div className="min-w-0 space-y-6">
            <Panel
              icon={<FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />}
              title="SKILL.md"
              trailing={
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-500">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
                  </span>
                  Editing
                </span>
              }
            >
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                ref={editorContainerRef}
                className="mdx-editor-wrapper relative"
                onClick={(e) => {
                  if (!hasChanges) return;
                  const anchor = (e.target as HTMLElement).closest("a[href]");
                  if (!anchor) return;
                  const href = anchor.getAttribute("href");
                  if (href && href.startsWith("/")) {
                    e.preventDefault();
                    e.stopPropagation();
                    guardedNavigate(href);
                  }
                }}
              >
                <MarkdownEditorLazy
                  editorRef={editorRef}
                  overlayContainer={editorContainerRef.current}
                  markdown={markdownContent}
                  onChange={handleChange}
                />
                <MentionPopover
                  open={mention.open}
                  anchor={mention.anchor}
                  items={mention.items}
                  selectedIndex={mention.selectedIndex}
                  isLoading={mention.isLoading}
                  query={mention.query}
                  onSelect={(index) => mention.insertSelected(index)}
                  onHover={(index) => mention.setSelectedIndex(index)}
                />
              </div>
            </Panel>
          </div>

          {/* ---- Sidebar ---- */}
          <aside className="hidden min-w-0 lg:block lg:h-full">
            <div className="flex h-full flex-col gap-6">
              {/* Resources panel */}
              <Panel
                icon={<Paperclip className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Resources"
                trailing={
                  <span className="text-[10px] text-muted-foreground">
                    {data.resources.length} file
                    {data.resources.length !== 1 ? "s" : ""}
                  </span>
                }
                className="shrink-0"
              >
                <div>
                  {data.resources.length === 0 ? (
                    <p className="px-5 py-4 text-xs text-muted-foreground">
                      No resources attached.
                    </p>
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
                            onNavigate={(event, href) => {
                              if (!hasChanges) return;
                              event.preventDefault();
                              event.stopPropagation();
                              guardedNavigate(href);
                            }}
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
              </Panel>
            </div>
          </aside>
        </div>
      </div>

      {/* Unsaved-changes confirmation dialog */}
      <AlertDialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you leave this page. Are you sure you
              want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm" onClick={() => setPendingHref(null)}>
              Continue editing
            </AlertDialogCancel>
            <AlertDialogAction size="sm" variant="destructive" onClick={confirmLeave}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
