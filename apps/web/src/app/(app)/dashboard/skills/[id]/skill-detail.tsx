"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, FileText, Loader2, Network } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ForceGraph } from "@/components/graph/force-graph";
import { createMarkdownComponents } from "@/components/skills/markdown-components";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
import { DownloadContentButton } from "@/components/skills/download-content-button";
import { getResourceDownloadName, getResourceMimeType } from "@/components/skills/resource-file";
import { ResourceHoverLink } from "@/components/skills/resource-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

function jsonEntries(value: Record<string, unknown>) {
  return Object.entries(value).slice(0, 12);
}

function displayValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export default function SkillDetail({ id }: { id: string }) {
  const { data, isLoading, isError } = useQuery(trpc.skills.getById.queryOptions({ id }));
  const graphQuery = useQuery(trpc.skills.graphForSkill.queryOptions({ skillId: id }));
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [mobileContentTab, setMobileContentTab] = useState<"markdown" | "graph">("markdown");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    setMobileContentTab("markdown");
  }, [id]);

  const frontmatter = useMemo(() => (data ? jsonEntries(data.frontmatter) : []), [data]);
  const metadata = useMemo(() => (data ? jsonEntries(data.metadata) : []), [data]);
  const resources = data?.resources ?? [];

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

  const skillId = data?.id ?? id;

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName: data?.name,
        findResourceByHref,
      }),
    [data?.name, skillId, resourcesById, resourcesByPath],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6 lg:col-span-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Skill Not Found</CardTitle>
              <CardDescription>
                The requested skill is not accessible or does not exist.
              </CardDescription>
            </CardHeader>
            <CardContent>
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

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10 overflow-x-hidden">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4">
          <Link href={"/dashboard" as Route}>
            <Button variant="outline" size="sm">
              <ArrowLeft />
              Back to Skills
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="min-w-0 space-y-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardDescription className="flex w-full justify-between">
                  <div>skills / {data.slug}</div>
                  <DownloadContentButton
                    content={data.originalMarkdown}
                    fileName={`${data.slug || "skill"}.md`}
                    mimeType="text/markdown;charset=utf-8"
                    variant="outline"
                    size="sm"
                    label="Download"
                  />
                </CardDescription>
                <CardTitle className="text-2xl leading-tight text-primary sm:text-3xl break-words">
                  {data.name}
                </CardTitle>
                <div className="space-y-2">
                  <p
                    className={[
                      "text-muted-foreground text-sm break-words",
                      descriptionExpanded
                        ? ""
                        : "[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {data.description}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Badge variant="outline">{data.visibility}</Badge>
                    <Badge variant="secondary">{data.resources.length} resources</Badge>
                    {data.sourceIdentifier ? (
                      <Badge variant="outline">{data.sourceIdentifier}</Badge>
                    ) : null}
                  </div>
                  {data.description.length > 300 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDescriptionExpanded((prev) => !prev)}
                      aria-label={
                        descriptionExpanded ? "Collapse description" : "Expand description"
                      }
                    >
                      {descriptionExpanded ? "Collapse" : "Expand"}
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {data.sourceUrl ? (
                    <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        Source
                        <ArrowUpRight />
                      </Button>
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div
              className="mb-0 grid grid-cols-2 border-x border-t border-border lg:hidden"
              role="tablist"
              aria-label="Skill content tabs"
            >
              <button
                type="button"
                id="skill-content-tab-markdown"
                role="tab"
                aria-controls="skill-content-panel-markdown"
                aria-selected={mobileContentTab === "markdown"}
                className={`h-11 w-full border-r border-border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  mobileContentTab === "markdown"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMobileContentTab("markdown")}
              >
                Markdown
              </button>
              <button
                type="button"
                id="skill-content-tab-graph"
                role="tab"
                aria-controls="skill-content-panel-graph"
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

            <Card>
              <CardHeader>
                <CardTitle className="hidden items-center gap-2 text-base lg:flex">
                  <FileText className="size-4" aria-hidden="true" />
                  SKILL.md
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-hidden">
                <div
                  id="skill-content-panel-markdown"
                  role="tabpanel"
                  aria-labelledby="skill-content-tab-markdown"
                  className={mobileContentTab === "markdown" ? "" : "hidden lg:block"}
                >
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

                <div
                  id="skill-content-panel-graph"
                  role="tabpanel"
                  aria-labelledby="skill-content-tab-graph"
                  className={mobileContentTab === "graph" ? "lg:hidden" : "hidden"}
                >
                  <div className="flex min-h-[280px] h-[45vh] items-center justify-center border border-dashed border-primary/30 bg-primary/5 p-4 text-center text-sm text-primary/80">
                    Graph canvas coming soon
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base text-primary">Skill Data</CardTitle>
                <CardDescription>Structured fields stored with this skill.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h3 className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Frontmatter
                  </h3>
                  {frontmatter.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No frontmatter values.</p>
                  ) : (
                    <div className="space-y-2">
                      {frontmatter.map(([key, value]) => (
                        <div key={key} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-3">
                          <p className="text-muted-foreground text-xs break-words">{key}</p>
                          <p className="text-sm break-words">{displayValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Metadata
                  </h3>
                  {metadata.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No metadata values.</p>
                  ) : (
                    <div className="space-y-2">
                      {metadata.map(([key, value]) => (
                        <div key={key} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-3">
                          <p className="text-muted-foreground text-xs break-words">{key}</p>
                          <p className="text-sm break-words">{displayValue(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    Resources
                  </h3>
                  {data.resources.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No resources attached.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.resources.map((resource) => (
                        <div key={resource.id} className="border border-border px-3 py-2">
                          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <ResourceHoverLink
                              resource={resource}
                              skillId={data.id}
                              skillName={data.name}
                              className="text-sm break-all min-w-0 text-primary underline underline-offset-4"
                            >
                              {resource.path}
                            </ResourceHoverLink>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{resource.kind}</Badge>
                              <DownloadContentButton
                                content={resource.content}
                                fileName={getResourceDownloadName(
                                  resource.path,
                                  `${resource.id}.txt`,
                                )}
                                mimeType={getResourceMimeType(resource.path)}
                                iconOnly
                                label="Download"
                                variant="outline"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="min-w-0 space-y-6 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Slug</p>
                  <p className="break-words">{data.slug}</p>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Owner</p>
                  <p className="break-words">{data.ownerUserId ?? "Global"}</p>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Created</p>
                  <p>{formatDate(data.createdAt)}</p>
                </div>
                <div className="grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-2">
                  <p className="text-muted-foreground">Updated</p>
                  <p>{formatDate(data.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hidden lg:flex lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="size-4" aria-hidden="true" />
                  Skill Graph
                </CardTitle>
              </CardHeader>
              <CardContent>
                {graphQuery.isLoading && (
                  <div className="flex items-center justify-center h-[480px]">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                {graphQuery.isError && (
                  <div className="flex items-center justify-center h-[480px]">
                    <p className="text-sm text-muted-foreground">Failed to load graph</p>
                  </div>
                )}
                {graphQuery.data && (
                  <ForceGraph data={graphQuery.data} focusNodeId={id} height={600} />
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
