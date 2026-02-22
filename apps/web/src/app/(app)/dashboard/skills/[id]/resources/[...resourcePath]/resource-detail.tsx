"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, FileText, FolderTree, Loader2, Network } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ForceGraph } from "@/components/graph/force-graph";
import { createMarkdownComponents } from "@/components/skills/markdown-components";
import { DownloadContentButton } from "@/components/skills/download-content-button";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
import {
  canRenderResourceAsMarkdown,
  getResourceDownloadName,
  getResourceMimeType,
} from "@/components/skills/resource-file";
import { buildResourceHref } from "@/components/skills/resource-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

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
  const [mobileContentTab, setMobileContentTab] = useState<"markdown" | "graph">("markdown");
  const graphQuery = useQuery(trpc.skills.graphForSkill.queryOptions({ skillId }));

  const resources = skillQuery.data?.resources ?? [];
  const resourcesById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );
  const resourcesByPath = useMemo(
    () => new Map(resources.map((resource) => [resource.path, resource])),
    [resources],
  );

  const findResourceByHref = (href: string) => {
    let decodedHref = href;
    try {
      decodedHref = decodeURIComponent(href);
    } catch {}

    if (decodedHref.startsWith("resource://")) {
      const byId = resourcesById.get(decodedHref.replace("resource://", ""));
      if (byId) return byId;
    }

    if (resourcesByPath.has(decodedHref)) {
      return resourcesByPath.get(decodedHref)!;
    }

    const match = resources.find(
      (resource) =>
        decodedHref.endsWith(resource.path) || decodedHref.endsWith(`/${resource.path}`),
    );

    return match ?? null;
  };

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: skillQuery.data?.name ?? resourceQuery.data?.skillName,
        findResourceByHref,
      }),
    [skillId, skillQuery.data?.name, resourceQuery.data?.skillName, resourcesById, resourcesByPath],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setMobileContentTab("markdown");
  }, [skillId, resourcePath]);

  if (resourceQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6 lg:col-span-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (resourceQuery.isError || !resourceQuery.data) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Resource Not Found</CardTitle>
              <CardDescription>
                The requested resource is not accessible or does not exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Link href={"/dashboard" as Route}>
                <Button variant="outline">
                  <ArrowLeft />
                  Back to Skills
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const resource = resourceQuery.data;
  const parentSkillName = skillQuery.data?.name ?? resource.skillName;
  const resourceDownloadName = getResourceDownloadName(resource.path, `${resource.id}.txt`);
  const resourceMimeType = getResourceMimeType(resource.path);
  const canRenderMarkdown = canRenderResourceAsMarkdown(resource.path, resource.kind);

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href={"/dashboard" as Route}>
            <Button variant="outline" size="sm">
              <ArrowLeft />
              Back to Skills
            </Button>
          </Link>
          <Link href={`/dashboard/skills/${skillId}` as Route}>
            <Button variant="outline" size="sm">
              Parent Skill
              <ArrowUpRight />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="min-w-0 space-y-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardDescription>resource / {resource.kind}</CardDescription>
                <CardTitle className="text-2xl leading-tight sm:text-3xl break-words">
                  {resource.path}
                </CardTitle>
                <p className="text-muted-foreground text-sm break-words">
                  Child resource of{" "}
                  <Link
                    href={`/dashboard/skills/${resource.skillId}` as Route}
                    className="text-primary underline underline-offset-4"
                  >
                    {parentSkillName}
                  </Link>
                  .
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="secondary">{resource.kind} resource</Badge>
                  <Badge variant="outline">Updated {formatDate(resource.updatedAt)}</Badge>
                </div>
              </CardHeader>
            </Card>

            <div
              className="mb-0 grid grid-cols-2 border-x border-t border-border lg:hidden"
              role="tablist"
              aria-label="Resource content tabs"
            >
              <button
                type="button"
                id="resource-content-tab-markdown"
                role="tab"
                aria-controls="resource-content-panel-markdown"
                aria-selected={mobileContentTab === "markdown"}
                className={`h-11 w-full border-r border-border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  mobileContentTab === "markdown"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMobileContentTab("markdown")}
              >
                {canRenderMarkdown ? "Markdown" : "Download"}
              </button>
              <button
                type="button"
                id="resource-content-tab-graph"
                role="tab"
                aria-controls="resource-content-panel-graph"
                aria-selected={mobileContentTab === "graph"}
                className={`h-11 w-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  mobileContentTab === "graph"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMobileContentTab("graph")}
              >
                Graph
              </button>
            </div>

            {canRenderMarkdown ? (
              <Card>
                <CardHeader>
                  <CardTitle className="hidden items-start gap-2 text-base min-w-0 lg:flex">
                    <FileText className="size-4" aria-hidden="true" />
                    <span>Resource Content</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="min-w-0 overflow-hidden">
                  <div
                    id="resource-content-panel-markdown"
                    role="tabpanel"
                    aria-labelledby="resource-content-tab-markdown"
                    className={mobileContentTab === "markdown" ? "" : "hidden lg:block"}
                  >
                    <article className="min-w-0 break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                        urlTransform={markdownUrlTransform}
                      >
                        {resource.content}
                      </ReactMarkdown>
                    </article>
                  </div>

                  <div
                    id="resource-content-panel-graph"
                    role="tabpanel"
                    aria-labelledby="resource-content-tab-graph"
                    className={mobileContentTab === "graph" ? "lg:hidden" : "hidden"}
                  >
                    {graphQuery.isLoading && (
                      <div className="flex items-center justify-center h-[45vh] min-h-[280px]">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {graphQuery.isError && (
                      <div className="flex items-center justify-center h-[45vh] min-h-[280px]">
                        <p className="text-sm text-muted-foreground">Failed to load graph</p>
                      </div>
                    )}
                    {graphQuery.data && (
                      <ForceGraph
                        data={graphQuery.data}
                        focusNodeId={resourceQuery.data?.id ?? skillId}
                        height={400}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
                  <FileText className="size-8 text-muted-foreground/50" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    This file cannot be rendered as Markdown.
                  </p>
                  <DownloadContentButton
                    content={resource.content}
                    fileName={resourceDownloadName}
                    mimeType={resourceMimeType}
                    variant="outline"
                    size="sm"
                    label="Download File"
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderTree className="size-4" aria-hidden="true" />
                  Related Resources
                </CardTitle>
                <CardDescription>More references from the same skill.</CardDescription>
              </CardHeader>
              <CardContent>
                {resources.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No related resources found.</p>
                ) : (
                  <div className="space-y-2">
                    {resources.map((item) => (
                      <div key={item.id} className="border border-border px-3 py-2">
                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Link
                            href={buildResourceHref(skillId, item.path)}
                            className="text-sm min-w-0 break-all text-primary underline underline-offset-4"
                          >
                            {item.path}
                          </Link>
                          <Badge variant="outline">{item.kind}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="min-w-0 space-y-6 lg:col-span-4 lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-92px)]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resource Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Kind</p>
                  <p>{resource.kind}</p>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Path</p>
                  <p className="break-all">{resource.path}</p>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Parent Skill</p>
                  <Link
                    href={`/dashboard/skills/${resource.skillId}` as Route}
                    className="break-words text-primary underline underline-offset-4"
                  >
                    {parentSkillName}
                  </Link>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Updated</p>
                  <p>{formatDate(resource.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hidden flex-col lg:flex lg:min-h-0 lg:flex-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="size-4" aria-hidden="true" />
                  Skill Graph
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1">
                {graphQuery.isLoading && (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {graphQuery.isError && (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">Failed to load graph</p>
                  </div>
                )}
                {graphQuery.data && (
                  <ForceGraph
                    data={graphQuery.data}
                    focusNodeId={resourceQuery.data?.id ?? skillId}
                    height={600}
                  />
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
