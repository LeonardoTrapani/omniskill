"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ChevronDown,
  FileText,
  FolderTree,
  Info,
  Loader2,
  Network,
  Pencil,
} from "lucide-react";
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
import { ResourceHoverLink } from "@/components/skills/resource-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/*  Reusable bordered panel matching dashboard / skill-detail          */
/* ------------------------------------------------------------------ */
function Panel({
  icon,
  title,
  trailing,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  isEmpty = false,
}: {
  icon: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  isEmpty?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const headerContent = (
    <>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          {title}
        </h2>
        {isEmpty && !open && (
          <span className="text-[10px] normal-case tracking-normal text-muted-foreground/50">
            empty
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {trailing}
        {collapsible && (
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform duration-150 ${open ? "" : "-rotate-90"}`}
            aria-hidden="true"
          />
        )}
      </div>
    </>
  );

  return (
    <div className={`border border-border bg-background/90 backdrop-blur-sm ${className ?? ""}`}>
      {collapsible ? (
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-3.5 border-b border-border/70 transition-colors duration-150 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70">
          {headerContent}
        </div>
      )}
      {(!collapsible || open) && children}
    </div>
  );
}

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
  }, [skillId, resourcePath]);

  /* ---- Loading ---- */
  if (resourceQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-96" />
            <Skeleton className="h-4 w-[560px]" />
          </div>
          <Separator />
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ---- Error ---- */
  if (resourceQuery.isError || !resourceQuery.data) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-4 py-32">
          <p className="text-sm text-muted-foreground">
            The requested resource is not accessible or does not exist.
          </p>
          <Link href={"/dashboard" as Route}>
            <Button variant="outline" size="sm">
              Back to Skills
            </Button>
          </Link>
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
    <main className="relative min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-0">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--border)_72%,transparent)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />

      <div className="relative mx-auto max-w-7xl">
        {/* ============================================================ */}
        {/*  HEADER                                                       */}
        {/* ============================================================ */}
        <header className="space-y-5 pb-8">
          {/* Top bar: breadcrumb nav */}
          <div className="flex items-center justify-between gap-4">
            <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              <Link
                href={"/dashboard" as Route}
                className="transition-colors duration-150 hover:text-foreground"
              >
                skills
              </Link>
              <span className="text-border">/</span>
              <Link
                href={`/dashboard/skills/${skillId}` as Route}
                className="truncate transition-colors duration-150 hover:text-foreground"
              >
                {parentSkillName}
              </Link>
              <span className="text-border">/</span>
              <span className="truncate text-foreground">{resource.path}</span>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" aria-label="Edit skill">
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit
              </Button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-tight text-foreground text-balance break-words sm:text-3xl">
              {resource.path}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground break-words text-pretty">
              Child resource of{" "}
              <Link
                href={`/dashboard/skills/${resource.skillId}` as Route}
                className="text-primary underline-offset-4 hover:underline"
              >
                {parentSkillName}
              </Link>
              .
            </p>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-1.5 bg-primary" aria-hidden="true" />
              {resource.kind}
            </span>
            <span className="text-border">|</span>
            <span>Updated {formatDate(resource.updatedAt)}</span>
            <span className="text-border">|</span>
            <Link
              href={`/dashboard/skills/${skillId}` as Route}
              className="inline-flex items-center gap-0.5 text-primary transition-colors duration-150 hover:text-primary/80"
            >
              Parent Skill
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <Separator className="mb-8" />

        {/* ============================================================ */}
        {/*  BODY: content + sidebar                                      */}
        {/* ============================================================ */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* ---- Main column ---- */}
          <div className="min-w-0 space-y-6">
            {/* Mobile graph toggle */}
            <div className="lg:hidden">
              <Panel
                icon={<Network className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Skill Graph"
                collapsible
                defaultOpen={false}
              >
                <div>
                  {graphQuery.isLoading && (
                    <div className="flex h-[320px] items-center justify-center">
                      <Loader2
                        className="size-4 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  {graphQuery.isError && (
                    <div className="flex h-[320px] items-center justify-center">
                      <p className="text-xs text-muted-foreground">Failed to load graph</p>
                    </div>
                  )}
                  {graphQuery.data && (
                    <ForceGraph
                      data={graphQuery.data}
                      focusNodeId={resourceQuery.data?.id ?? skillId}
                      height={360}
                    />
                  )}
                </div>
              </Panel>
            </div>

            {/* Resource content panel */}
            {canRenderMarkdown ? (
              <Panel
                icon={<FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Resource Content"
              >
                <div className="px-5 py-5">
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
              </Panel>
            ) : (
              <Panel
                icon={<FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Resource Content"
              >
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-5 py-8 text-center">
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
                </div>
              </Panel>
            )}

            {/* Related resources panel */}
            <Panel
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
            >
              <div>
                {resources.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-muted-foreground">
                    No related resources found.
                  </p>
                ) : (
                  <div>
                    {resources.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 px-5 py-2.5 ${
                          idx < resources.length - 1 ? "border-b border-border/40" : ""
                        }`}
                      >
                        <ResourceHoverLink
                          resource={item}
                          skillId={skillId}
                          skillName={parentSkillName}
                          className="min-w-0 break-all text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {item.path}
                        </ResourceHoverLink>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {item.kind}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* ---- Sidebar ---- */}
          <aside className="hidden min-w-0 lg:block lg:h-full">
            <div className="flex h-full flex-col gap-6">
              {/* Resource details panel */}
              <Panel
                icon={<Info className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Details"
                className="shrink-0"
              >
                <div className="px-5 py-4">
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Kind</dt>
                      <dd className="text-foreground">{resource.kind}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Path</dt>
                      <dd className="truncate text-right text-foreground">{resource.path}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Parent</dt>
                      <dd className="truncate text-right">
                        <Link
                          href={`/dashboard/skills/${resource.skillId}` as Route}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {parentSkillName}
                        </Link>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd className="text-foreground">{formatDate(resource.updatedAt)}</dd>
                    </div>
                  </dl>
                </div>
              </Panel>

              {/* Graph panel -- sticky, fills remaining space */}
              <Panel
                icon={<Network className="size-3.5 text-muted-foreground" aria-hidden="true" />}
                title="Skill Graph"
                className="sticky top-[68px] flex h-[calc(100dvh-92px)] min-h-0 flex-col"
              >
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  {graphQuery.isLoading && (
                    <div className="flex h-full items-center justify-center">
                      <Loader2
                        className="size-4 animate-spin text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                  {graphQuery.isError && (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-xs text-muted-foreground">Failed to load graph</p>
                    </div>
                  )}
                  {graphQuery.data && (
                    <GraphFill
                      data={graphQuery.data}
                      focusNodeId={resourceQuery.data?.id ?? skillId}
                    />
                  )}
                </div>
              </Panel>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  GraphFill                                                          */
/*  Renders ForceGraph filling its parent container via ResizeObserver  */
/* ------------------------------------------------------------------ */
function GraphFill({
  data,
  focusNodeId,
}: {
  data: import("@/components/graph/force-graph").GraphData;
  focusNodeId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setHeight(Math.max(el.clientHeight, 200));
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ForceGraph data={data} focusNodeId={focusNodeId} height={height} />
    </div>
  );
}
