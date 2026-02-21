"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { markdownUrlTransform } from "@/components/skills/markdown-url-transform";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";

export type ResourceLike = {
  id: string;
  path: string;
  kind: string;
  content: string;
  updatedAt: string | Date;
};

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function buildResourceHref(skillSlug: string, resourcePath: string) {
  const encodedSlug = encodeURIComponent(skillSlug);
  const encodedPath = resourcePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/dashboard/skills/${encodedSlug}/resources/${encodedPath}` as Route;
}

export function ResourceHoverLink({
  resource,
  skillSlug,
  skillName,
  className,
  children,
}: {
  resource: ResourceLike;
  skillSlug: string;
  skillName?: string;
  className?: string;
  children?: ReactNode;
}) {
  const preview = resource.content.trim();
  const snippet = preview.length > 240 ? `${preview.slice(0, 240)}...` : preview;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Link
          href={buildResourceHref(skillSlug, resource.path)}
          className={className ?? "text-primary underline underline-offset-4"}
        >
          {children ?? resource.path}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-[360px] overflow-hidden">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{resource.path}</p>
            <Badge variant="outline">{resource.kind}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">From skill: {skillName ?? skillSlug}</p>
          <Separator />
          <div className="rounded-none border border-border bg-secondary/20 p-3 min-w-0">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText className="size-3" aria-hidden="true" />
              Resource preview
            </p>
            {snippet ? (
              <article className="prose prose-sm max-w-none overflow-hidden text-xs leading-5 prose-p:my-1 prose-code:rounded-none prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 [&_*]:max-w-full [&_a]:break-all [&_code]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_ul]:pl-4 [&_ol]:pl-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>
                  {snippet}
                </ReactMarkdown>
              </article>
            ) : (
              <p className="text-xs leading-5 whitespace-pre-wrap break-words">(empty)</p>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Updated {formatDate(resource.updatedAt)}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
