"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderTree } from "lucide-react";

import {
  DesktopSkillGraphPanel,
  MobileSkillGraphPanel,
} from "@/components/skills/detail-page/skill-graph-panels";
import { SkillPageErrorState } from "@/components/skills/detail-page/skill-page-error-state";
import { SkillPageLoadingState } from "@/components/skills/detail-page/skill-page-loading-state";
import { SkillPageShell } from "@/components/skills/detail-page/skill-page-shell";
import { createMarkdownComponents } from "@/components/markdown/markdown-components";
import { ResourceList } from "@/components/skills/resource-list";
import {
  canRenderResourceAsMarkdown,
  getResourceDownloadName,
  getResourceMimeType,
} from "@/components/markdown/resource-file";
import { Separator } from "@/components/ui/separator";
import { SkillPanel } from "@/components/skills/skill-panel";
import { createResourceHrefResolver } from "@/lib/skills/resource-links";
import { dashboardRoute } from "@/lib/skills/routes";
import { trpc } from "@/lib/api/trpc";
import { ResourceContentPanel } from "@/app/vault/skills/[id]/resources/[...resourcePath]/_components/resource-content-panel";
import { ResourceDetailHeader } from "@/app/vault/skills/[id]/resources/[...resourcePath]/_components/resource-detail-header";

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ResourceDetail({
  skillId,
  resourcePath,
}: {
  skillId: string;
  resourcePath: string;
}) {
  const resourceQuery = useQuery(
    trpc.skills.getResourceBySkillIdAndPath.queryOptions({ skillId, resourcePath }),
  );
  const skillQuery = useQuery(trpc.skills.getById.queryOptions({ id: skillId }));
  const graphQuery = useQuery(trpc.skills.graphForSkill.queryOptions({ skillId }));

  const resources = skillQuery.data?.resources ?? [];
  const findResourceByHref = useMemo(() => createResourceHrefResolver(resources), [resources]);

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: skillQuery.data?.name ?? resourceQuery.data?.skillName,
        findResourceByHref,
      }),
    [skillId, skillQuery.data?.name, resourceQuery.data?.skillName, findResourceByHref],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [skillId, resourcePath]);

  /* ---- Loading ---- */
  if (resourceQuery.isLoading) {
    return <SkillPageLoadingState maxWidthClass="max-w-6xl" />;
  }

  /* ---- Error ---- */
  if (resourceQuery.isError || !resourceQuery.data) {
    return (
      <SkillPageErrorState
        message="The requested resource is not accessible or does not exist."
        href={dashboardRoute}
        ctaLabel="Back to Skills"
        maxWidthClass="max-w-6xl"
      />
    );
  }

  const resource = resourceQuery.data;
  const parentSkillName = skillQuery.data?.name ?? resource.skillName;
  const resourceDownloadName = getResourceDownloadName(resource.path, `${resource.id}.txt`);
  const resourceMimeType = getResourceMimeType(resource.path);
  const canRenderMarkdown = canRenderResourceAsMarkdown(resource.path, resource.kind);

  return (
    <SkillPageShell>
      <ResourceDetailHeader
        skillId={skillId}
        parentSkillName={parentSkillName}
        resourcePath={resource.path}
        resourceKind={resource.kind}
        updatedAt={resource.updatedAt}
      />

      <Separator className="mb-8" />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <MobileSkillGraphPanel
            data={graphQuery.data}
            isLoading={graphQuery.isLoading}
            isError={graphQuery.isError}
            focusNodeId={resource.id}
          />

          <ResourceContentPanel
            canRenderMarkdown={canRenderMarkdown}
            content={resource.content}
            markdownComponents={markdownComponents}
            downloadName={resourceDownloadName}
            mimeType={resourceMimeType}
          />

          <SkillPanel
            icon={<FolderTree className="size-3.5 text-muted-foreground" aria-hidden="true" />}
            title="Related Resources"
            trailing={
              <span className="text-[10px] text-muted-foreground">
                {resources.length} file{resources.length !== 1 ? "s" : ""}
              </span>
            }
            collapsible
            defaultOpen={resources.length > 0}
            isEmpty={resources.length === 0}
            className="border"
          >
            <ResourceList
              resources={resources}
              skillId={skillId}
              skillName={parentSkillName}
              emptyMessage="No related resources found."
            />
          </SkillPanel>
        </div>

        <aside className="hidden min-w-0 lg:block lg:h-full">
          <div className="flex h-full flex-col gap-6">
            <DesktopSkillGraphPanel
              data={graphQuery.data}
              isLoading={graphQuery.isLoading}
              isError={graphQuery.isError}
              focusNodeId={resource.id}
            />
          </div>
        </aside>
      </div>
    </SkillPageShell>
  );
}
