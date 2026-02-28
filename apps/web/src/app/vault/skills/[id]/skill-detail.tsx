"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { DesktopSkillGraphPanel } from "@/components/skills/detail-page/skill-graph-panels";
import { SkillPageErrorState } from "@/components/skills/detail-page/skill-page-error-state";
import { SkillPageLoadingState } from "@/components/skills/detail-page/skill-page-loading-state";
import { createMarkdownComponents } from "@/components/markdown/markdown-components";
import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import { ForceGraph, type GraphNode } from "@/components/skills/graph/force-graph";
import { GridBackground } from "@/components/ui/grid-background";
import { useResourceTabs } from "@/hooks/skills/use-resource-tabs";
import {
  createResourceHrefResolver,
  type SkillResourceReference,
} from "@/lib/skills/resource-links";
import { dashboardRoute } from "@/lib/skills/routes";
import { trpc } from "@/lib/api/trpc";
import { ContentTabBar } from "@/app/vault/skills/[id]/_components/content-tab-bar";
import { ResourceTabContent } from "@/app/vault/skills/[id]/_components/resource-tab-content";
import { SkillDetailHeader } from "@/app/vault/skills/[id]/_components/skill-detail-header";
import { SidebarPanel } from "@/app/vault/skills/[id]/_components/sidebar-panel";
import {
  MobileSectionControl,
  type MobileSection,
} from "@/app/vault/skills/[id]/_components/mobile-section-control";
import { MobileResourceList } from "@/app/vault/skills/[id]/_components/mobile-resource-list";
import { ResourceList } from "@/components/skills/resource-list";

function SkillDetailInner({ id }: { id: string }) {
  const { data, isLoading, isError } = useQuery(
    trpc.skills.getById.queryOptions({ id, linkMentions: true }),
  );
  const graphQuery = useQuery(trpc.skills.graphForSkill.queryOptions({ skillId: id }));

  const [mobileSection, setMobileSection] = useState<MobileSection>("content");

  const resources = data?.resources ?? [];
  const skillSlug = data?.slug ?? data?.name ?? "skill";
  const skillId = data?.id ?? id;
  const isDefaultSkill = data?.isDefault ?? false;

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  const handleOpenResourceTab = useCallback(
    (resource: SkillResourceReference) => {
      openResource(resource);
      setMobileSection("content");
    },
    [openResource],
  );

  const handleMobileTabSwitch = useCallback(
    (tabId: string) => {
      switchTab(tabId);
      setMobileSection("content");
    },
    [switchTab],
  );

  const handleResourceListNavigate = useCallback(
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
          setMobileSection("content");
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
        findResourceByHref: createResourceHrefResolver(resources),
        onResourceNavigate: handleOpenResourceTab,
      }),
    [data?.name, handleOpenResourceTab, resources, skillId],
  );

  const mobileMarkdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: data?.name,
        findResourceByHref: createResourceHrefResolver(resources),
        onResourceNavigate: handleOpenResourceTab,
      }),
    [data?.name, handleOpenResourceTab, resources, skillId],
  );

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
  };

  const viewingResourceLabel = activeTab.kind === "resource" ? activeTab.path : null;

  return (
    <main className="relative min-h-screen bg-background lg:h-[calc(100dvh-52px)] lg:min-h-0 lg:overflow-hidden">
      <div className="relative p-4 pb-6 sm:p-6 lg:hidden">
        <div className="mx-auto max-w-3xl">
          <SkillDetailHeader
            {...headerProps}
            viewingResource={mobileSection === "content" ? viewingResourceLabel : null}
          />

          <div className="overflow-hidden border border-border bg-background/90">
            <MobileSectionControl
              value={mobileSection}
              onChange={setMobileSection}
              resourceCount={resources.length}
            />

            {mobileSection === "content" && tabs.length > 1 && (
              <div className="border-b border-border bg-background/70">
                <ContentTabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSwitch={handleMobileTabSwitch}
                  onClose={closeTab}
                />
              </div>
            )}

            <div
              id="skill-mobile-section-panel-content"
              role="tabpanel"
              aria-labelledby="skill-mobile-section-tab-content"
              hidden={mobileSection !== "content"}
              className={mobileSection === "content" ? "block" : "hidden"}
            >
              {activeTab.kind === "skill" ? (
                <div className="px-4 py-5 sm:px-5">
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
              ) : (
                activeResourcePath && (
                  <ResourceTabContent
                    skillId={skillId}
                    skillName={data.name}
                    resourcePath={activeResourcePath}
                    resources={resources}
                    onResourceNavigate={handleOpenResourceTab}
                    compact
                  />
                )
              )}
            </div>

            <div
              id="skill-mobile-section-panel-resources"
              role="tabpanel"
              aria-labelledby="skill-mobile-section-tab-resources"
              hidden={mobileSection !== "resources"}
              className={mobileSection === "resources" ? "block" : "hidden"}
            >
              <MobileResourceList
                resources={resources}
                onSelect={handleOpenResourceTab}
                framed={false}
              />
            </div>

            <div
              id="skill-mobile-section-panel-graph"
              role="tabpanel"
              aria-labelledby="skill-mobile-section-tab-graph"
              hidden={mobileSection !== "graph"}
              className={
                mobileSection === "graph" ? "relative min-h-[360px] overflow-hidden" : "hidden"
              }
            >
              {graphQuery.isLoading ? (
                <div className="flex h-[360px] items-center justify-center">
                  <Loader2
                    className="size-4 animate-spin text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              ) : graphQuery.isError ? (
                <div className="flex h-[360px] items-center justify-center">
                  <p className="text-xs text-muted-foreground">Failed to load graph</p>
                </div>
              ) : graphQuery.data ? (
                <>
                  <GridBackground className="opacity-32" />
                  <ForceGraph
                    data={graphQuery.data}
                    focusNodeId={focusNodeId}
                    height={380}
                    onNodeClick={handleGraphNodeClick}
                    mobileInitialScale={0.9}
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden h-full lg:flex">
        <aside className="w-[280px] xl:w-[320px] shrink-0 border-r border-border flex flex-col">
          <div className="px-5 pb-5 pt-2 overflow-y-auto shrink-0 border-b border-border">
            <SkillDetailHeader {...headerProps} compact viewingResource={viewingResourceLabel} />
          </div>

          <SidebarPanel
            graphContent={
              <DesktopSkillGraphPanel
                data={graphQuery.data}
                isLoading={graphQuery.isLoading}
                isError={graphQuery.isError}
                focusNodeId={focusNodeId}
                onNodeClick={handleGraphNodeClick}
                showTitle={false}
              />
            }
            resourcesContent={
              <div className="py-4">
                <ResourceList
                  resources={data.resources}
                  skillId={data.id}
                  skillName={data.name}
                  emptyMessage="No resources attached."
                  onNavigate={handleResourceListNavigate}
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
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab.kind === "skill" ? (
              <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
                <article className="mt-3 min-w-0 break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={desktopMarkdownComponents}
                    urlTransform={markdownUrlTransform}
                  >
                    {data.renderedMarkdown || data.originalMarkdown}
                  </ReactMarkdown>
                </article>
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
