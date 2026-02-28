"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, Loader2, PencilLine } from "lucide-react";
import { toast } from "sonner";

import {
  buildResourceMentionHref,
  buildSkillMentionHref,
  editorMarkdownToStorageMarkdown,
} from "@/components/markdown/mention-markdown";
import MarkdownEditorLazy from "@/components/markdown/markdown-editor-lazy";
import MentionPopover from "@/components/skills/mention-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnsavedChangesDialog } from "@/app/vault/skills/[id]/_components/unsaved-changes-dialog";
import { useMentionAutocomplete, type MentionItem } from "@/hooks/skills/use-mention-autocomplete";
import { useIsDesktopLg } from "@/hooks/use-is-desktop-lg";
import { trpc } from "@/lib/api/trpc";
import { invalidateSkillCollectionQueries } from "@/lib/skills/invalidate-skill-queries";
import { buildSkillHref, dashboardRoute } from "@/lib/skills/routes";
import type { MDXEditorMethods } from "@mdxeditor/editor";

const INITIAL_MARKDOWN = "";

function stripLeftoverMentionPrefix(
  markdown: string,
  trigger: string,
  escapedTrigger: string,
  linkText: string,
) {
  const escapedCombined = `${escapedTrigger}${linkText}`;
  const escapedCombinedIndex = markdown.lastIndexOf(escapedCombined);
  if (escapedCombinedIndex !== -1) {
    return (
      markdown.slice(0, escapedCombinedIndex) +
      linkText +
      markdown.slice(escapedCombinedIndex + escapedCombined.length)
    );
  }

  const rawCombined = `${trigger}${linkText}`;
  const rawCombinedIndex = markdown.lastIndexOf(rawCombined);
  if (rawCombinedIndex !== -1) {
    return (
      markdown.slice(0, rawCombinedIndex) +
      linkText +
      markdown.slice(rawCombinedIndex + rawCombined.length)
    );
  }

  return markdown;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SkillCreate() {
  const router = useRouter();
  const isDesktopLg = useIsDesktopLg();

  const mobileEditorRef = useRef<MDXEditorMethods>(null);
  const desktopEditorRef = useRef<MDXEditorMethods>(null);
  const mobileEditorContainerRef = useRef<HTMLDivElement>(null);
  const desktopEditorContainerRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [hasTouchedSlug, setHasTouchedSlug] = useState(false);
  const [pendingHref, setPendingHref] = useState<Route | null>(null);

  const getActiveEditor = useCallback(
    () => (isDesktopLg ? desktopEditorRef.current : mobileEditorRef.current),
    [isDesktopLg],
  );

  const activeEditorContainerRef = isDesktopLg
    ? desktopEditorContainerRef
    : mobileEditorContainerRef;

  const initialStateRef = useRef({
    name: "",
    slug: "",
    description: "",
    markdown: INITIAL_MARKDOWN,
  });

  const hasChanges = useMemo(() => {
    return (
      name !== initialStateRef.current.name ||
      slug !== initialStateRef.current.slug ||
      description !== initialStateRef.current.description ||
      markdown !== initialStateRef.current.markdown
    );
  }, [name, slug, description, markdown]);

  const canCreate =
    name.trim().length > 0 && slug.trim().length > 0 && description.trim().length > 0;

  const guardedNavigate = useCallback(
    (href: Route) => {
      if (hasChanges) {
        setPendingHref(href);
        return;
      }
      router.push(href);
    },
    [hasChanges, router],
  );

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) {
      router.push(href);
    }
  }, [pendingHref, router]);

  useEffect(() => {
    if (!hasChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const createMutation = useMutation(
    trpc.skills.create.mutationOptions({
      onSuccess: async (createdSkill) => {
        await invalidateSkillCollectionQueries(createdSkill.id);
        toast.success("Skill created successfully");
        router.push(buildSkillHref(createdSkill.id));
      },
      onError: (error) => {
        toast.error(`Failed to create skill: ${error.message}`);
      },
    }),
  );

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim();
    const trimmedSlug = toSlug(slug);
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedSlug || !trimmedDescription) {
      toast.error("Name, slug, and description are required");
      return;
    }

    const currentMarkdown = getActiveEditor()?.getMarkdown() ?? markdown;

    createMutation.mutate({
      name: trimmedName,
      slug: trimmedSlug,
      description: trimmedDescription,
      skillMarkdown: editorMarkdownToStorageMarkdown(currentMarkdown),
    });
  }, [name, slug, description, markdown, createMutation, getActiveEditor]);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!hasTouchedSlug) {
        setSlug(toSlug(value));
      }
    },
    [hasTouchedSlug],
  );

  const handleSlugChange = useCallback((value: string) => {
    setHasTouchedSlug(true);
    setSlug(toSlug(value));
  }, []);

  const handleMentionInsert = useCallback(
    (item: MentionItem, mentionRange: Range, query: string) => {
      const activeEditor = getActiveEditor();

      const linkText = (() => {
        if (item.type === "skill") {
          return `[${item.label}](${buildSkillMentionHref(item.id)})`;
        }

        if (!item.parentSkillId) {
          return `[[resource:${item.id.toLowerCase()}]]`;
        }

        const label = item.subtitle ? `${item.label} for ${item.subtitle}` : item.label;
        const href = buildResourceMentionHref(item.parentSkillId, item.label, item.id);

        return `[${label}](${href})`;
      })();

      activeEditor?.focus(undefined, { preventScroll: true });

      const trigger = `[[${query}`;
      const escapedTrigger = `\\[\\[${query}`;
      let inserted = false;

      const selection = window.getSelection();
      if (selection) {
        try {
          selection.removeAllRanges();

          const mentionText = mentionRange.toString();
          if (mentionText.startsWith("[[") || mentionText.startsWith("\\[\\[")) {
            selection.addRange(mentionRange.cloneRange());
            selection.deleteFromDocument();
            inserted = true;
          }
        } catch {
          inserted = false;
        }
      }

      if (inserted) {
        activeEditor?.insertMarkdown(linkText);
        const afterInsertMarkdown = activeEditor?.getMarkdown();
        if (afterInsertMarkdown != null) {
          const cleanedMarkdown = stripLeftoverMentionPrefix(
            afterInsertMarkdown,
            trigger,
            escapedTrigger,
            linkText,
          );

          if (cleanedMarkdown !== afterInsertMarkdown) {
            activeEditor?.setMarkdown(cleanedMarkdown);
            setMarkdown(cleanedMarkdown);
          } else {
            setMarkdown(afterInsertMarkdown);
          }
        }
        return;
      }

      const currentMarkdown = activeEditor?.getMarkdown();
      if (currentMarkdown == null) return;

      let updatedMarkdown = currentMarkdown;
      const escapedIndex = currentMarkdown.lastIndexOf(escapedTrigger);
      const rawIndex = currentMarkdown.lastIndexOf(trigger);

      if (escapedIndex > rawIndex) {
        updatedMarkdown =
          currentMarkdown.slice(0, escapedIndex) +
          linkText +
          currentMarkdown.slice(escapedIndex + escapedTrigger.length);
      } else if (rawIndex !== -1) {
        updatedMarkdown =
          currentMarkdown.slice(0, rawIndex) +
          linkText +
          currentMarkdown.slice(rawIndex + trigger.length);
      }

      if (updatedMarkdown !== currentMarkdown) {
        activeEditor?.setMarkdown(updatedMarkdown);
        setMarkdown(updatedMarkdown);
      }
    },
    [getActiveEditor],
  );

  const mention = useMentionAutocomplete({
    editorContainerRef: activeEditorContainerRef,
    onInsert: handleMentionInsert,
  });
  const showEditorPlaceholder = markdown.trim().length === 0;

  const handleEditorContainerClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!hasChanges) return;
      const anchor = (event.target as HTMLElement).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href as Route);
    },
    [hasChanges],
  );

  const handleEditorChange = useCallback((nextMarkdown: string) => {
    setMarkdown(nextMarkdown);
  }, []);

  return (
    <main className="relative min-h-screen bg-background lg:h-[calc(100dvh-52px)] lg:min-h-0 lg:overflow-hidden">
      <div className="relative lg:hidden p-5 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <header className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                <button
                  type="button"
                  onClick={() => guardedNavigate(dashboardRoute)}
                  className="transition-colors duration-150 hover:text-foreground"
                >
                  skills
                </button>
                <span className="text-border">/</span>
                <span className="text-emerald-500">new</span>
              </nav>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => guardedNavigate(dashboardRoute)}>
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  {hasChanges ? "Discard" : "Cancel"}
                </Button>
                <Button
                  size="sm"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                  disabled={!canCreate || createMutation.isPending}
                  onClick={handleCreate}
                >
                  {createMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                  {createMutation.isPending ? "Creating..." : "Create skill"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                Create a new skill
              </h1>
              <p className="text-sm text-muted-foreground">
                Start from scratch using the same markdown editor from the edit view.
              </p>
            </div>
          </header>

          <section className="border border-border/70 bg-background/70">
            <div className="border-b border-border/70 px-5 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
                Details
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label htmlFor="skill-name" className="text-[11px] font-mono text-muted-foreground">
                  Name
                </label>
                <Input
                  id="skill-name"
                  placeholder="React Data Fetching"
                  value={name}
                  onChange={(event) => handleNameChange(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="skill-slug" className="text-[11px] font-mono text-muted-foreground">
                  Slug
                </label>
                <Input
                  id="skill-slug"
                  placeholder="react-data-fetching"
                  value={slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Used in the skill URL.</p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="skill-description"
                  className="text-[11px] font-mono text-muted-foreground"
                >
                  Description
                </label>
                <Textarea
                  id="skill-description"
                  className="min-h-20"
                  placeholder="What this skill helps with"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="border border-border/70 bg-background/70">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3">
              <div className="inline-flex items-center gap-2">
                <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
                  SKILL.md
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-500">
                <PencilLine className="size-3" aria-hidden="true" />
                Draft
              </span>
            </div>
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div
              ref={mobileEditorContainerRef}
              className="mdx-editor-wrapper relative"
              onClick={handleEditorContainerClick}
            >
              {showEditorPlaceholder ? (
                <div className="pointer-events-none absolute left-4 top-4 z-10 text-xs text-muted-foreground/80">
                  Start writing your skill in markdown...
                </div>
              ) : null}
              <MarkdownEditorLazy
                editorRef={mobileEditorRef}
                overlayContainer={mobileEditorContainerRef.current}
                markdown={markdown}
                onChange={handleEditorChange}
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
          </section>
        </div>
      </div>

      <div className="relative hidden h-full lg:flex">
        <aside className="w-[300px] xl:w-[340px] shrink-0 border-r border-border flex flex-col">
          <div className="px-5 pb-5 pt-3 overflow-y-auto space-y-5">
            <header className="space-y-4">
              <Button
                variant="link"
                size="xs"
                className="h-6 p-0 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                aria-label="Back to dashboard"
                onClick={() => guardedNavigate(dashboardRoute)}
              >
                <ArrowLeft className="size-3" aria-hidden="true" />
                Back
              </Button>

              <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground font-mono">
                <button
                  type="button"
                  onClick={() => guardedNavigate(dashboardRoute)}
                  className="shrink-0 transition-colors duration-150 hover:text-foreground"
                >
                  skills
                </button>
                <span className="shrink-0 text-border">/</span>
                <span className="text-emerald-500">new</span>
              </nav>

              <div className="space-y-2">
                <h1 className="text-lg font-semibold leading-tight text-foreground">
                  Create new skill
                </h1>
                <p className="text-xs text-muted-foreground">
                  Fill the metadata, then draft the markdown content.
                </p>
              </div>
            </header>

            <section className="border border-border/70 bg-background/70">
              <div className="border-b border-border/70 px-4 py-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
                  Details
                </h2>
              </div>
              <div className="space-y-3 p-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="desktop-skill-name"
                    className="text-[11px] font-mono text-muted-foreground"
                  >
                    Name
                  </label>
                  <Input
                    id="desktop-skill-name"
                    placeholder="React Data Fetching"
                    value={name}
                    onChange={(event) => handleNameChange(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="desktop-skill-slug"
                    className="text-[11px] font-mono text-muted-foreground"
                  >
                    Slug
                  </label>
                  <Input
                    id="desktop-skill-slug"
                    placeholder="react-data-fetching"
                    value={slug}
                    onChange={(event) => handleSlugChange(event.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">Used in the skill URL.</p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="desktop-skill-description"
                    className="text-[11px] font-mono text-muted-foreground"
                  >
                    Description
                  </label>
                  <Textarea
                    id="desktop-skill-description"
                    className="min-h-20"
                    placeholder="What this skill helps with"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => guardedNavigate(dashboardRoute)}
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {hasChanges ? "Discard" : "Cancel"}
              </Button>
              <Button
                size="sm"
                className="flex-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                disabled={!canCreate || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-3.5" aria-hidden="true" />
                )}
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="border-b border-border">
            <div className="flex items-stretch bg-background">
              <div className="group relative flex shrink-0 items-center gap-1.5 border-r border-border px-3 py-2 text-[11px] font-mono bg-background text-foreground">
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-emerald-500" />
                <FileText className="size-3" aria-hidden="true" />
                <span className="max-w-[160px] truncate">SKILL.md</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-500 ml-1">
                  <PencilLine className="size-3" aria-hidden="true" />
                  Draft
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                ref={desktopEditorContainerRef}
                className="mdx-editor-wrapper relative"
                onClick={handleEditorContainerClick}
              >
                {showEditorPlaceholder ? (
                  <div className="pointer-events-none absolute left-4 top-4 z-10 text-sm text-muted-foreground/80">
                    Start writing your skill in markdown...
                  </div>
                ) : null}
                <MarkdownEditorLazy
                  editorRef={desktopEditorRef}
                  overlayContainer={desktopEditorContainerRef.current}
                  markdown={markdown}
                  onChange={handleEditorChange}
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
            </div>
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
        onCancel={() => setPendingHref(null)}
        onDiscard={confirmLeave}
      />
    </main>
  );
}
