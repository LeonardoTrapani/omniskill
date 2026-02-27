"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";

import { SkillPageErrorState } from "@/components/skills/detail-page/skill-page-error-state";
import { SkillPageLoadingState } from "@/components/skills/detail-page/skill-page-loading-state";
import { SkillPageShell } from "@/components/skills/detail-page/skill-page-shell";
import {
  buildResourceMentionHref,
  buildSkillMentionHref,
  editorMarkdownToStorageMarkdown,
  storageMarkdownToEditorMarkdown,
} from "@/components/markdown/mention-markdown";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { ResourceList } from "@/components/skills/resource-list";
import { SkillPanel } from "@/components/skills/skill-panel";
import { useMentionAutocomplete, type MentionItem } from "@/hooks/skills/use-mention-autocomplete";
import { invalidateSkillEditQueries } from "@/lib/skills/invalidate-skill-queries";
import { buildSkillHref, dashboardRoute } from "@/lib/skills/routes";
import { authClient } from "@/lib/auth/auth-client";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/api/trpc";
import { SkillEditEditorPanel } from "@/app/vault/skills/[id]/edit/_components/skill-edit-editor-panel";
import { SkillEditHeader } from "@/app/vault/skills/[id]/edit/_components/skill-edit-header";
import { UnsavedChangesDialog } from "@/app/vault/skills/[id]/edit/_components/unsaved-changes-dialog";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function replaceLastOccurrence(input: string, search: string, replacement: string) {
  const index = input.lastIndexOf(search);
  if (index === -1) return input;
  return `${input.slice(0, index)}${replacement}${input.slice(index + search.length)}`;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function SkillEdit({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { data, isLoading, isError } = useQuery(
    trpc.skills.getById.queryOptions({ id, linkMentions: true }),
  );

  const editorRef = useRef<MDXEditorMethods>(null);
  const hasMountedRef = useRef(false);
  const initialMarkdownRef = useRef("");
  const [hasChanges, setHasChanges] = useState(false);

  /* ---- Unsaved-changes navigation guard ---- */
  const [pendingHref, setPendingHref] = useState<Route | null>(null);

  const guardedNavigate = useCallback(
    (href: Route) => {
      if (hasChanges) {
        setPendingHref(href);
      } else {
        router.push(href);
      }
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

  /* Warn on browser tab close / refresh */
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);
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
      onSuccess: async () => {
        const currentMarkdown = editorRef.current?.getMarkdown();
        if (currentMarkdown != null) {
          initialMarkdownRef.current = currentMarkdown;
        }
        await invalidateSkillEditQueries(id);
        setHasChanges(false);
        toast.success("Skill saved successfully");
        router.push(buildSkillHref(id));
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
      const activeSkillId = (data?.id ?? id).toLowerCase();

      // Build a friendly markdown link for display in the editor
      const linkText = (() => {
        if (item.type === "skill") {
          const href = buildSkillMentionHref(item.id);
          return `[${item.label}](${href})`;
        }

        if (!item.parentSkillId) {
          return `[[resource:${item.id.toLowerCase()}]]`;
        }

        const isInternalResource = item.parentSkillId.toLowerCase() === activeSkillId;
        const label = isInternalResource
          ? item.label
          : item.subtitle
            ? `${item.label} for ${item.subtitle}`
            : item.label;
        const href = buildResourceMentionHref(item.parentSkillId, item.label, item.id);

        return `[${label}](${href})`;
      })();

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
    [data?.id, id],
  );

  const mention = useMentionAutocomplete({
    skillId: data?.id ?? id,
    editorContainerRef,
    onInsert: handleMentionInsert,
  });

  /* ---- Loading ---- */
  if (isLoading) {
    return <SkillPageLoadingState layout="editor" />;
  }

  /* ---- Error ---- */
  if (isError || !data) {
    return (
      <SkillPageErrorState
        message="The requested skill is not accessible or does not exist."
        href={dashboardRoute}
        ctaLabel="Back to Skills"
      />
    );
  }

  const isOwnedByViewer = data.ownerUserId != null && data.ownerUserId === session?.user?.id;
  const isDefaultSkill = data.isDefault;
  const canEditSkill = data.visibility === "private" && isOwnedByViewer && !isDefaultSkill;

  /* ---- Not editable ---- */
  if (!canEditSkill) {
    return (
      <SkillPageErrorState
        message={
          isDefaultSkill
            ? "Default skills are read-only and cannot be edited."
            : "Editing is only available for your private skills. Import this skill into your vault first."
        }
        href={buildSkillHref(data.id)}
        ctaLabel="Back to Skill"
      />
    );
  }

  const markdownContent = editorMarkdown;

  return (
    <SkillPageShell>
      <SkillEditHeader
        slug={data.slug}
        name={data.name}
        description={data.description}
        updatedAt={data.updatedAt}
        resourcesCount={data.resources.length}
        hasChanges={hasChanges}
        isSaving={saveMutation.isPending}
        onNavigate={guardedNavigate}
        onSave={handleSave}
        skillHref={buildSkillHref(data.id)}
        dashboardHref={dashboardRoute}
      />

      <Separator className="mb-8" />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* ---- Main column: editor ---- */}
        <div className="min-w-0 space-y-6">
          <SkillEditEditorPanel
            id={id}
            hasChanges={hasChanges}
            markdown={markdownContent}
            editorRef={editorRef}
            editorContainerRef={editorContainerRef}
            mention={mention}
            onChange={handleChange}
            onNavigate={guardedNavigate}
          />
        </div>

        <aside className="hidden min-w-0 lg:block lg:h-full">
          <div className="flex h-full flex-col gap-6">
            <SkillPanel
              icon={<Paperclip className="size-3.5 text-muted-foreground" aria-hidden="true" />}
              title="Resources"
              trailing={
                <span className="text-[10px] text-muted-foreground">
                  {data.resources.length} file
                  {data.resources.length !== 1 ? "s" : ""}
                </span>
              }
              className="shrink-0 border"
            >
              <ResourceList
                resources={data.resources}
                skillId={data.id}
                skillName={data.name}
                emptyMessage="No resources attached."
                onNavigate={(event, href) => {
                  if (!hasChanges) return;
                  event.preventDefault();
                  event.stopPropagation();
                  guardedNavigate(href);
                }}
              />
            </SkillPanel>
          </div>
        </aside>
      </div>

      <UnsavedChangesDialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
        onCancel={() => setPendingHref(null)}
        onDiscard={confirmLeave}
      />
    </SkillPageShell>
  );
}
