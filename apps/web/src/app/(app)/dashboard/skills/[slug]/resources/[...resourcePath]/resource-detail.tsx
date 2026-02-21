"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, FileText, FolderTree, Network } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/skills/markdown-components";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
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
  slug,
  resourcePath,
}: {
  slug: string;
  resourcePath: string;
}) {
  const resourceQuery = useQuery(
    trpc.skills.getResourceByPath.queryOptions({ skillSlug: slug, resourcePath }),
  );
  const skillQuery = useQuery(trpc.skills.getBySlug.queryOptions({ slug }));

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
        skillSlug: slug,
        skillName: skillQuery.data?.name ?? resourceQuery.data?.skillName,
        findResourceByHref,
      }),
    [slug, skillQuery.data?.name, resourceQuery.data?.skillName, resourcesById, resourcesByPath],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug, resourcePath]);

  if (resourceQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 md:px-10">
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
      <main className="min-h-screen bg-background px-6 py-8 md:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Resource Not Found</CardTitle>
              <CardDescription>
                The requested resource is not accessible or does not exist.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
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

  const resource = resourceQuery.data;

  return (
    <main className="min-h-screen bg-background px-6 py-8 md:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex flex-wrap gap-2">
          <Link href="/skills">
            <Button variant="outline" size="sm">
              <ArrowLeft />
              Back to Skills
            </Button>
          </Link>
          <Link href={`/dashboard/skills/${slug}` as Route}>
            <Button variant="outline" size="sm">
              Parent Skill
              <ArrowUpRight />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardDescription>skills / {resource.skillSlug}</CardDescription>
                <CardTitle className="text-3xl leading-tight text-primary">
                  {skillQuery.data?.name ?? resource.skillName}
                </CardTitle>
                {skillQuery.data?.description ? (
                  <p className="text-muted-foreground text-sm break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
                    {skillQuery.data.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {skillQuery.data?.visibility ? (
                    <Badge variant="outline">{skillQuery.data.visibility}</Badge>
                  ) : null}
                  <Badge variant="secondary">{resources.length} resources</Badge>
                  {skillQuery.data?.sourceIdentifier ? (
                    <Badge variant="outline">{skillQuery.data.sourceIdentifier}</Badge>
                  ) : null}
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" aria-hidden="true" />
                  {resource.path}
                </CardTitle>
                <div className="pt-1">
                  <Badge variant="secondary">{resource.kind} resource</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <article className="min-w-0 break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                    urlTransform={markdownUrlTransform}
                  >
                    {resource.content}
                  </ReactMarkdown>
                </article>
              </CardContent>
            </Card>

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
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={buildResourceHref(slug, item.path)}
                            className="text-sm min-w-0 truncate text-primary underline underline-offset-4"
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

          <aside className="space-y-6 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resource Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Kind</p>
                  <p>{resource.kind}</p>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Path</p>
                  <p className="break-words">{resource.path}</p>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Parent Skill</p>
                  <Link
                    href={`/dashboard/skills/${resource.skillSlug}` as Route}
                    className="text-primary underline underline-offset-4"
                  >
                    {resource.skillName}
                  </Link>
                </div>
                <div className="grid grid-cols-[112px_1fr] gap-2 text-sm">
                  <p className="text-muted-foreground">Updated</p>
                  <p>{formatDate(resource.updatedAt)}</p>
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
