"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Download, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import type { MDXEditorMethods } from "@mdxeditor/editor";

import AddSkillModal from "@/components/skills/add-skill-modal";
import {
  DesktopSkillGraphPanel,
  MobileSkillGraphPanel,
} from "@/components/skills/detail-page/skill-graph-panels";
import { SkillPageErrorState } from "@/components/skills/detail-page/skill-page-error-state";
import { SkillPageLoadingState } from "@/components/skills/detail-page/skill-page-loading-state";
import { createMarkdownComponents } from "@/components/markdown/markdown-components";
import {
  buildResourceMentionHref,
  buildSkillMentionHref,
  editorMarkdownToStorageMarkdown,
  storageMarkdownToEditorMarkdown,
} from "@/components/markdown/mention-markdown";
import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import type { GraphNode } from "@/components/skills/graph/force-graph";
import { ResourceList } from "@/components/skills/resource-list";
import { SkillPanel } from "@/components/skills/skill-panel";
import { Button } from "@/components/ui/button";
import { useAddSkillFlow } from "@/hooks/skills/use-add-skill-flow";
import { useMentionAutocomplete, type MentionItem } from "@/hooks/skills/use-mention-autocomplete";
import { useResourceTabs } from "@/hooks/skills/use-resource-tabs";
import {
  invalidateSkillCollectionQueries,
  invalidateSkillEditQueries,
} from "@/lib/skills/invalidate-skill-queries";
import {
  createResourceHrefResolver,
  type SkillResourceReference,
} from "@/lib/skills/resource-links";
import { useIsDesktopLg } from "@/hooks/use-is-desktop-lg";
import { dashboardRoute } from "@/lib/skills/routes";
import { trpc } from "@/lib/api/trpc";
import { ContentTabBar } from "@/app/vault/skills/[id]/_components/content-tab-bar";
import { DeleteSkillDialog } from "@/app/vault/skills/[id]/_components/delete-skill-dialog";
import { ResourceTabContent } from "@/app/vault/skills/[id]/_components/resource-tab-content";
import { SkillDetailHeader } from "@/app/vault/skills/[id]/_components/skill-detail-header";
import { SkillEditEditorPanel } from "@/app/vault/skills/[id]/_components/skill-edit-editor-panel";
import { SidebarPanel } from "@/app/vault/skills/[id]/_components/sidebar-panel";
import { UnsavedChangesDialog } from "@/app/vault/skills/[id]/_components/unsaved-changes-dialog";

type PendingAction =
  | {
      type: "navigate";
      href: Route;
    }
  | {
      type: "exit-edit";
    }
  | null;

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

function SkillDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDesktopLg = useIsDesktopLg();

  const { selectedSkill, modalOpen, openAddSkillFlow, closeAddSkillFlow } = useAddSkillFlow({
    loginNext: `/vault/skills/${id}`,
  });

  const { data, isLoading, isError } = useQuery(
    trpc.skills.getById.queryOptions({ id, linkMentions: true }),
  );
  const graphQuery = useQuery(trpc.skills.graphForSkill.queryOptions({ skillId: id }));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const handledModeParamRef = useRef(false);

  const mobileEditorRef = useRef<MDXEditorMethods>(null);
  const desktopEditorRef = useRef<MDXEditorMethods>(null);
  const mobileEditorContainerRef = useRef<HTMLDivElement>(null);
  const desktopEditorContainerRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const initialMarkdownRef = useRef("");
  const lastSubmittedMarkdownRef = useRef("");
  const [hasChanges, setHasChanges] = useState(false);

  const getActiveEditor = useCallback(
    () => (isDesktopLg ? desktopEditorRef.current : mobileEditorRef.current),
    [isDesktopLg],
  );

  const activeEditorContainerRef = isDesktopLg
    ? desktopEditorContainerRef
    : mobileEditorContainerRef;

  const resources = data?.resources ?? [];
  const skillSlug = data?.slug ?? data?.name ?? "skill";
  const skillId = data?.id ?? id;
  const isDefaultSkill = data?.isDefault ?? false;
  const canManageSkill = !isDefaultSkill;
  const canAddToVault = false;

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
    lastSubmittedMarkdownRef.current = editorMarkdown;
    setHasChanges(false);
  }, [data, editorMarkdown]);

  useEffect(() => {
    handledModeParamRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!data || !canManageSkill || handledModeParamRef.current) {
      return;
    }

    if (searchParams.get("mode") !== "edit") {
      return;
    }

    handledModeParamRef.current = true;
    setIsEditing(true);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("mode");
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [canManageSkill, data, searchParams]);

  useEffect(() => {
    if (!isEditing || !hasChanges) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditing, hasChanges]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

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

  const saveMutation = useMutation(
    trpc.skills.update.mutationOptions({
      onSuccess: async () => {
        initialMarkdownRef.current = lastSubmittedMarkdownRef.current;
        await invalidateSkillEditQueries(id);
        setHasChanges(false);
        setIsEditing(false);
        toast.success("Skill saved successfully");
      },
      onError: (error) => {
        toast.error(`Failed to save: ${error.message}`);
      },
    }),
  );

  const {
    tabs,
    activeTab,
    activeTabId,
    activeResourcePath,
    focusNodeId,
    openResource,
    closeTab,
    switchTab,
  } = useResourceTabs({
    skillId: data?.id ?? id,
    skillSlug,
    resources,
    isReady: !isLoading && !!data,
  });

  const guardedNavigate = useCallback(
    (href: Route) => {
      if (isEditing && hasChanges) {
        setPendingAction({ type: "navigate", href });
      } else {
        router.push(href);
      }
    },
    [hasChanges, isEditing, router],
  );

  const exitEditMode = useCallback(() => {
    getActiveEditor()?.setMarkdown(initialMarkdownRef.current);
    setHasChanges(false);
    setIsEditing(false);
  }, [getActiveEditor]);

  const handleDiscardRequest = useCallback(() => {
    if (!isEditing) return;
    if (hasChanges) {
      setPendingAction({ type: "exit-edit" });
      return;
    }
    exitEditMode();
  }, [exitEditMode, hasChanges, isEditing]);

  const confirmPendingAction = useCallback(() => {
    if (!pendingAction) return;

    if (pendingAction.type === "navigate") {
      const { href } = pendingAction;
      setPendingAction(null);
      router.push(href);
      return;
    }

    exitEditMode();
    setPendingAction(null);
  }, [exitEditMode, pendingAction, router]);

  const handleSave = useCallback(() => {
    const markdown = getActiveEditor()?.getMarkdown();
    if (markdown == null || !data) return;
    lastSubmittedMarkdownRef.current = markdown;
    saveMutation.mutate({
      id: data.id,
      skillMarkdown: editorMarkdownToStorageMarkdown(markdown),
    });
  }, [data, getActiveEditor, saveMutation]);

  const handleChange = useCallback(() => {
    if (!hasMountedRef.current) return;
    const currentMarkdown = getActiveEditor()?.getMarkdown();
    if (currentMarkdown == null) return;
    setHasChanges(currentMarkdown !== initialMarkdownRef.current);
  }, [getActiveEditor]);

  const handleMentionInsert = useCallback(
    (item: MentionItem, mentionRange: Range, query: string) => {
      const activeEditor = getActiveEditor();
      const activeSkillId = (data?.id ?? id).toLowerCase();

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
            setHasChanges(cleanedMarkdown !== initialMarkdownRef.current);
          } else {
            setHasChanges(afterInsertMarkdown !== initialMarkdownRef.current);
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
        setHasChanges(updatedMarkdown !== initialMarkdownRef.current);
      }
    },
    [data?.id, getActiveEditor, id],
  );

  const mention = useMentionAutocomplete({
    skillId: data?.id ?? id,
    editorContainerRef: activeEditorContainerRef,
    onInsert: handleMentionInsert,
    active: isEditing,
  });

  const findResourceByHref = useMemo(() => createResourceHrefResolver(resources), [resources]);

  const handleOpenResourceTab = useCallback(
    (resource: SkillResourceReference) => {
      openResource(resource);
    },
    [openResource],
  );

  const handleDesktopResourceListNavigate = useCallback(
    (event: React.MouseEvent<HTMLElement>, href: string) => {
      const skillHref = `/vault/skills/${encodeURIComponent(skillId)}`;
      const legacyPrefix = `${skillHref}/resources/`;

      let decodedPath: string | null = null;
      if (href.startsWith(legacyPrefix)) {
        const encodedPath = href.slice(legacyPrefix.length);
        decodedPath = encodedPath
          .split("/")
          .filter(Boolean)
          .map((segment) => decodeURIComponent(segment))
          .join("/");
      } else {
        const parsed = new URL(href, window.location.origin);
        if (parsed.pathname !== skillHref) return;

        decodedPath = parsed.searchParams.get("resource");
      }

      if (!decodedPath) return;

      const resource = resources.find((resourceItem) => resourceItem.path === decodedPath);
      if (resource) {
        event.preventDefault();
        openResource(resource);
      }
    },
    [openResource, resources, skillId],
  );

  const handleGraphNodeClick = useCallback(
    (node: GraphNode): boolean | void => {
      if (node.type === "resource") {
        const resource = resources.find((resourceItem) => resourceItem.id === node.id);
        if (resource) {
          openResource(resource);
          return true;
        }
      }
    },
    [openResource, resources],
  );

  const desktopMarkdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: data?.name,
        findResourceByHref,
        onResourceNavigate: handleOpenResourceTab,
      }),
    [data?.name, findResourceByHref, handleOpenResourceTab, skillId],
  );

  const mobileMarkdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: data?.name,
        findResourceByHref,
      }),
    [data?.name, findResourceByHref, skillId],
  );

  const handleDownloadMd = useCallback(() => {
    const markdown = data?.originalMarkdown;
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data?.slug ?? data?.name ?? "skill"}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [data?.name, data?.originalMarkdown, data?.slug]);

  const handleStartEdit = useCallback(() => {
    if (!canManageSkill) return;
    setIsEditing(true);
    switchTab(skillId);
  }, [canManageSkill, skillId, switchTab]);

  if (isLoading) {
    return <SkillPageLoadingState />;
  }

  if (isError || !data) {
    return (
      <SkillPageErrorState
        message="The requested skill is not accessible or does not exist."
        href={dashboardRoute}
        ctaLabel="Back to Skills"
      />
    );
  }

  const headerProps = {
    slug: data.slug,
    name: data.name,
    description: data.description,
    isDefaultSkill,
    sourceIdentifier: data.sourceIdentifier,
    sourceUrl: data.sourceUrl,
    updatedAt: data.updatedAt,
    resourcesCount: data.resources.length,
    canAddToVault,
    canManageSkill,
    onAddToVault: () => openAddSkillFlow(data),
    onDelete: () => setDeleteDialogOpen(true),
    onEdit: handleStartEdit,
    onSave: handleSave,
    onDiscard: handleDiscardRequest,
    isEditing,
    hasChanges,
    isSaving: saveMutation.isPending,
  };

  const viewingResourceLabel = activeTab.kind === "resource" ? activeTab.path : null;

  return (
    <main className="relative min-h-screen bg-background lg:h-[calc(100dvh-52px)] lg:min-h-0 lg:overflow-hidden">
      <div className="relative lg:hidden p-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SkillDetailHeader {...headerProps} />

          <MobileSkillGraphPanel
            data={graphQuery.data}
            isLoading={graphQuery.isLoading}
            isError={graphQuery.isError}
            focusNodeId={id}
          />

          <div className="py-5">
            {isEditing ? (
              <SkillEditEditorPanel
                id={id}
                hasChanges={hasChanges}
                markdown={editorMarkdown}
                editorRef={mobileEditorRef}
                editorContainerRef={mobileEditorContainerRef}
                mention={mention}
                onChange={handleChange}
                onNavigate={guardedNavigate}
              />
            ) : (
              <article className="min-w-0 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mobileMarkdownComponents}
                  urlTransform={markdownUrlTransform}
                >
                  {data.renderedMarkdown || data.originalMarkdown}
                </ReactMarkdown>
              </article>
            )}
          </div>

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
            <ResourceList
              resources={data.resources}
              skillId={data.id}
              skillName={data.name}
              emptyMessage="No resources attached."
            />
          </SkillPanel>
        </div>
      </div>

      <div className="relative hidden h-full lg:flex">
        <aside className="w-[280px] xl:w-[320px] shrink-0 border-r border-border flex flex-col">
          <div className="px-5 pb-5 pt-2 overflow-y-auto shrink-0 border-b border-border">
            <SkillDetailHeader
              {...headerProps}
              compact
              viewingResource={viewingResourceLabel}
              showCompactActions={false}
            />
          </div>

          <SidebarPanel
            graphContent={
              <DesktopSkillGraphPanel
                data={graphQuery.data}
                isLoading={graphQuery.isLoading}
                isError={graphQuery.isError}
                focusNodeId={focusNodeId}
                onNodeClick={handleGraphNodeClick}
              />
            }
            resourcesContent={
              <div className="py-4">
                <ResourceList
                  resources={data.resources}
                  skillId={data.id}
                  skillName={data.name}
                  emptyMessage="No resources attached."
                  onNavigate={handleDesktopResourceListNavigate}
                />
              </div>
            }
          />
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="border-b border-border">
            <ContentTabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSwitch={switchTab}
              onClose={closeTab}
              isEditing={isEditing}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab.kind === "skill" ? (
              <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
                <div className="mb-4 flex items-center justify-end gap-3">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleDownloadMd}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Download className="size-3" aria-hidden="true" />
                      DOWNLOAD MD
                    </button>
                  )}

                  {canAddToVault && !isEditing && (
                    <Button
                      size="sm"
                      className="hover:bg-primary/90"
                      onClick={() => openAddSkillFlow(data)}
                    >
                      Add to Vault
                      <Plus className="size-3.5" />
                    </Button>
                  )}

                  {canManageSkill &&
                    (isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleDiscardRequest}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                        >
                          DISCARD
                        </button>
                        <button
                          type="button"
                          disabled={!hasChanges || saveMutation.isPending}
                          onClick={handleSave}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-amber-500 transition-colors hover:text-amber-400 disabled:cursor-not-allowed disabled:text-muted-foreground"
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                          ) : (
                            <Check className="size-3" aria-hidden="true" />
                          )}
                          {saveMutation.isPending ? "SAVING..." : "SAVE"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleStartEdit}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="Edit skill"
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteDialogOpen(true)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-red-400/70 transition-colors hover:text-red-400"
                          aria-label="Delete skill"
                        >
                          <Trash2 className="size-3" aria-hidden="true" />
                          DELETE
                        </button>
                      </>
                    ))}
                </div>

                {isEditing ? (
                  <SkillEditEditorPanel
                    id={id}
                    hasChanges={hasChanges}
                    markdown={editorMarkdown}
                    editorRef={desktopEditorRef}
                    editorContainerRef={desktopEditorContainerRef}
                    mention={mention}
                    onChange={handleChange}
                    onNavigate={guardedNavigate}
                  />
                ) : (
                  <article className="min-w-0 break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={desktopMarkdownComponents}
                      urlTransform={markdownUrlTransform}
                    >
                      {data.renderedMarkdown || data.originalMarkdown}
                    </ReactMarkdown>
                  </article>
                )}
              </div>
            ) : (
              activeResourcePath && (
                <ResourceTabContent
                  skillId={skillId}
                  skillName={data.name}
                  resourcePath={activeResourcePath}
                  resources={resources}
                  onResourceNavigate={handleOpenResourceTab}
                />
              )
            )}
          </div>
        </div>
      </div>

      <DeleteSkillDialog
        open={deleteDialogOpen}
        isDeleting={deleteMutation.isPending}
        skillName={data.name}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => deleteMutation.mutate({ id: data.id })}
      />

      <UnsavedChangesDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
        onCancel={() => setPendingAction(null)}
        onDiscard={confirmPendingAction}
      />

      <AddSkillModal
        key={selectedSkill?.id ?? "none"}
        open={modalOpen}
        onClose={closeAddSkillFlow}
        initialSkill={selectedSkill}
      />
    </main>
  );
}

export default function SkillDetail({ id }: { id: string }) {
  return (
    <Suspense fallback={<SkillPageLoadingState />}>
      <SkillDetailInner id={id} />
    </Suspense>
  );
}
