"use client";

import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Download, Paperclip, Pencil, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import {
  DesktopSkillGraphPanel,
  MobileSkillGraphPanel,
} from "@/components/skills/detail-page/skill-graph-panels";
import { SkillPageErrorState } from "@/components/skills/detail-page/skill-page-error-state";
import { SkillPageLoadingState } from "@/components/skills/detail-page/skill-page-loading-state";
import { createMarkdownComponents } from "@/components/markdown/markdown-components";
import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import type { GraphNode } from "@/components/skills/graph/force-graph";
import { ResourceList } from "@/components/skills/resource-list";
import { SkillPanel } from "@/components/skills/skill-panel";
import { Button } from "@/components/ui/button";
import { useResourceTabs } from "@/hooks/skills/use-resource-tabs";
import { invalidateSkillCollectionQueries } from "@/lib/skills/invalidate-skill-queries";
import {
  createResourceHrefResolver,
  type SkillResourceReference,
} from "@/lib/skills/resource-links";
import { buildSkillEditHref, dashboardRoute } from "@/lib/skills/routes";
import { trpc } from "@/lib/api/trpc";
import { ContentTabBar } from "@/app/vault/skills/[id]/_components/content-tab-bar";
import { DeleteSkillDialog } from "@/app/vault/skills/[id]/_components/delete-skill-dialog";
import { ResourceTabContent } from "@/app/vault/skills/[id]/_components/resource-tab-content";
import { SkillDetailHeader } from "@/app/vault/skills/[id]/_components/skill-detail-header";

function SkillDetailInner({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useQuery(trpc.me.queryOptions());
  const { data, isLoading, isError } = useQuery(
    trpc.skills.getById.queryOptions({ id, linkMentions: true }),
  );
  const graphQuery = useQuery(trpc.skills.graphForSkill.queryOptions({ skillId: id }));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const resources = data?.resources ?? [];
  const skillSlug = data?.slug ?? data?.name ?? "skill";

  /* ── Tab management ── */
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
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  const findResourceByHref = useMemo(() => createResourceHrefResolver(resources), [resources]);

  const skillId = data?.id ?? id;
  const isOwnedByViewer = data?.ownerUserId != null && data.ownerUserId === session?.user?.id;
  const isDefaultSkill = data?.isDefault ?? false;
  const canManageSkill = isOwnedByViewer && !isDefaultSkill;

  /* ── Desktop: intercept resource clicks to open as tab ── */
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
          .map((s) => decodeURIComponent(s))
          .join("/");
      } else {
        const parsed = new URL(href, window.location.origin);
        if (parsed.pathname !== skillHref) return;

        decodedPath = parsed.searchParams.get("resource");
      }

      if (!decodedPath) return;

      const resource = resources.find((r) => r.path === decodedPath);
      if (resource) {
        event.preventDefault();
        openResource(resource);
      }
    },
    [skillId, resources, openResource],
  );

  /** Graph node click handler — intercept resource nodes on desktop */
  const handleGraphNodeClick = useCallback(
    (node: GraphNode): boolean | void => {
      if (node.type === "resource") {
        const resource = resources.find((r) => r.id === node.id);
        if (resource) {
          openResource(resource);
          return true; // prevent default navigation
        }
      }
    },
    [resources, openResource],
  );

  /* ── Markdown components (desktop: with tab interception) ── */
  const desktopMarkdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: data?.name,
        findResourceByHref,
        onResourceNavigate: handleOpenResourceTab,
      }),
    [data?.name, skillId, findResourceByHref, handleOpenResourceTab],
  );

  /* ── Markdown components (mobile: normal navigation) ── */
  const mobileMarkdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: data?.name,
        findResourceByHref,
      }),
    [data?.name, skillId, findResourceByHref],
  );

  const handleDownloadMd = useCallback(() => {
    const md = data?.originalMarkdown;
    if (!md) return;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data?.slug ?? data?.name ?? "skill"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data?.originalMarkdown, data?.slug, data?.name]);

  /* ---- Loading ---- */
  if (isLoading) {
    return <SkillPageLoadingState />;
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

  const headerProps = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    isDefaultSkill,
    sourceIdentifier: data.sourceIdentifier,
    sourceUrl: data.sourceUrl,
    updatedAt: data.updatedAt,
    resourcesCount: data.resources.length,
    canManageSkill,
    onDelete: () => setDeleteDialogOpen(true),
  };

  /* ── Active resource path label for the sidebar indicator ── */
  const viewingResourceLabel = activeTab.kind === "resource" ? activeTab.path : null;

  return (
    <main className="relative min-h-screen bg-background lg:h-[calc(100dvh-52px)] lg:min-h-0 lg:overflow-hidden">
      {/* ── Mobile layout (stacked) ── */}
      <div className="relative lg:hidden p-5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SkillDetailHeader {...headerProps} />

          <MobileSkillGraphPanel
            data={graphQuery.data}
            isLoading={graphQuery.isLoading}
            isError={graphQuery.isError}
            focusNodeId={id}
          />

          {/* Markdown content */}
          <div className="py-5">
            <article className="min-w-0 break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={mobileMarkdownComponents}
                urlTransform={markdownUrlTransform}
              >
                {data.renderedMarkdown || data.originalMarkdown}
              </ReactMarkdown>
            </article>
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

      {/* ── Desktop layout (2-column: fixed left sidebar + tabbed right) ── */}
      <div className="relative hidden h-full lg:flex">
        {/* ── Left sidebar ── */}
        <aside className="w-[280px] xl:w-[320px] shrink-0 border-r border-border flex flex-col">
          {/* Metadata section */}
          <div className="p-5 overflow-y-auto shrink-0 border-b border-border">
            <SkillDetailHeader
              {...headerProps}
              compact
              viewingResource={viewingResourceLabel}
              showCompactActions={false}
            />
          </div>

          {/* Graph section (fills remaining vertical space) */}
          <div className="flex-1 min-h-[240px]">
            <DesktopSkillGraphPanel
              data={graphQuery.data}
              isLoading={graphQuery.isLoading}
              isError={graphQuery.isError}
              focusNodeId={focusNodeId}
              onNodeClick={handleGraphNodeClick}
            />
          </div>
        </aside>

        {/* ── Right content (tabbed, scrollable) ── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Tab bar */}
          <div className="border-b border-border">
            <ContentTabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSwitch={switchTab}
              onClose={closeTab}
            />
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab.kind === "skill" ? (
              <>
                {/* Skill markdown content */}
                <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
                  <div className="mb-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadMd}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Download className="size-3" aria-hidden="true" />
                      DOWNLOAD MD
                    </button>

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

                  <article className="min-w-0 break-words">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={desktopMarkdownComponents}
                      urlTransform={markdownUrlTransform}
                    >
                      {data.renderedMarkdown || data.originalMarkdown}
                    </ReactMarkdown>
                  </article>
                </div>

                {/* Below-fold panels */}
                <div className="border-t border-border">
                  <div className="max-w-4xl mx-auto px-8 xl:px-12 py-6 space-y-6">
                    <SkillPanel
                      icon={
                        <Paperclip className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      }
                      title="Resources"
                      trailing={
                        <span className="text-[10px] text-muted-foreground">
                          {data.resources.length} file
                          {data.resources.length !== 1 ? "s" : ""}
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
                        onNavigate={handleDesktopResourceListNavigate}
                      />
                    </SkillPanel>
                  </div>
                </div>
              </>
            ) : (
              /* Resource tab content */
              activeResourcePath && (
                <ResourceTabContent
                  skillId={skillId}
                  skillName={data.name}
                  resourcePath={activeResourcePath}
                  resources={resources}
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
    </main>
  );
}

/**
 * Wrap the inner component in Suspense because `useSearchParams()` (used by `useResourceTabs`)
 * requires a Suspense boundary in Next.js App Router.
 */
export default function SkillDetail({ id }: { id: string }) {
  return (
    <Suspense fallback={<SkillPageLoadingState />}>
      <SkillDetailInner id={id} />
    </Suspense>
  );
}
