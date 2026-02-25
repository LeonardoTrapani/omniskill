"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bot, FileText, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/skills/markdown-components";
import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";

export default function SkillEdit({ id }: { id: string }) {
  const { data: session } = authClient.useSession();
  const { data, isLoading, isError } = useQuery(trpc.skills.getById.queryOptions({ id }));

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
            <Skeleton className="h-[560px] w-full" />
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

  const isOwnedByViewer = data.ownerUserId != null && data.ownerUserId === session?.user?.id;
  const canEditSkill = data.visibility === "private" && isOwnedByViewer;

  if (!canEditSkill) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Editing is only available for your private skills</CardTitle>
              <CardDescription>
                Import this skill into your vault first, then open edit mode from your private copy.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href={`/dashboard/skills/${data.id}` as Route}>
                <Button variant="outline">
                  <ArrowLeft />
                  Back to Skill
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 md:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4">
          <Link href={`/dashboard/skills/${data.id}` as Route}>
            <Button variant="outline" size="sm">
              <ArrowLeft />
              Back to Skill
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="min-w-0 space-y-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardDescription>editing / {data.slug}</CardDescription>
                <CardTitle className="text-2xl leading-tight text-primary sm:text-3xl break-words">
                  {data.name}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="outline">private</Badge>
                  <Badge variant="secondary">{data.resources.length} resources</Badge>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="size-4" aria-hidden="true" />
                  SKILL.md
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-hidden">
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
          </section>

          <aside className="min-w-0 space-y-6 lg:col-span-4">
            <Card className="lg:sticky lg:top-[68px] lg:max-h-[calc(100vh-92px)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="size-4" aria-hidden="true" />
                  AI Skill Editor
                </CardTitle>
                <CardDescription>
                  This panel will let you chat with an AI agent to edit this skill.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-0">
                <div className="flex h-[60vh] flex-col gap-3">
                  <div className="flex items-center gap-2 border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                    <Bot className="size-3.5" aria-hidden="true" />
                    AI editing agent is not available yet.
                  </div>

                  <div className="flex-1 overflow-y-auto border border-border bg-background px-3 py-3">
                    <div className="mr-8 border border-border bg-secondary/50 px-3 py-2">
                      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        AI
                      </p>
                      <p className="text-sm text-foreground">
                        Soon you will be able to ask me to edit this skill and apply changes
                        directly.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    <Textarea
                      disabled
                      placeholder="AI editing will be available soon..."
                      className="min-h-20"
                    />
                    <Button disabled className="w-full" variant="outline">
                      Send (coming soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
