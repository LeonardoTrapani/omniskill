"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, FileText, Network } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/skills/markdown-components";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
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

export default function SkillDetail({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useQuery(trpc.skills.getBySlug.queryOptions({ slug }));
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

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

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillSlug: data?.slug ?? slug,
        skillName: data?.name,
        findResourceByHref,
      }),
    [data?.name, data?.slug, slug, resourcesById, resourcesByPath],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 md:px-10">
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
      <main className="min-h-screen bg-background px-6 py-8 md:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Skill Not Found</CardTitle>
              <CardDescription>
                The requested skill is not accessible or does not exist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/skills">
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
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4">
          <Link href="/skills">
            <Button variant="outline" size="sm">
              <ArrowLeft />
              Back to Skills
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardDescription>skills / {data.slug}</CardDescription>
                <CardTitle className="text-3xl leading-tight text-primary">{data.name}</CardTitle>
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
                <div className="flex justify-between">
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
              {data.sourceUrl ? (
                <CardContent className="pt-0">
                  <a href={data.sourceUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      Source
                      <ArrowUpRight />
                    </Button>
                  </a>
                </CardContent>
              ) : null}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" aria-hidden="true" />
                  SKILL.md
                </CardTitle>
              </CardHeader>
              <CardContent>
                <article className="min-w-0 break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                    urlTransform={markdownUrlTransform}
                  >
                    {data.renderedMarkdown || data.originalMarkdown}
                  </ReactMarkdown>
                </article>
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
                        <div key={key} className="grid grid-cols-[160px_1fr] gap-3">
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
                        <div key={key} className="grid grid-cols-[160px_1fr] gap-3">
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
                          <div className="flex items-center justify-between gap-2">
                            <ResourceHoverLink
                              resource={resource}
                              skillSlug={data.slug}
                              skillName={data.name}
                              className="text-sm truncate min-w-0 text-primary underline underline-offset-4"
                            >
                              {resource.path}
                            </ResourceHoverLink>
                            <Badge variant="outline">{resource.kind}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Slug</p>
                  <p className="break-words">{data.slug}</p>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Owner</p>
                  <p className="break-words">{data.ownerUserId ?? "Global"}</p>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Created</p>
                  <p>{formatDate(data.createdAt)}</p>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Updated</p>
                  <p>{formatDate(data.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:sticky lg:top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="size-4" aria-hidden="true" />
                  Your Graph
                </CardTitle>
                <CardDescription>Graph visualization placeholder.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-dashed border-primary/30 bg-primary/5 text-primary/80 flex h-[calc(100vh-8.5rem)] min-h-[480px] items-center justify-center text-center text-sm p-4">
                  Graph canvas coming soon
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
