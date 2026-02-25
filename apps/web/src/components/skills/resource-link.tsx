"use client";

import type { Route } from "next";
import type { ReactNode } from "react";

import { NodePreviewCard } from "@/components/graph/node-preview-card";
import { canRenderResourceAsMarkdown } from "@/components/skills/resource-file";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export type ResourceLike = {
  id: string;
  path: string;
  kind: string;
  content: string;
  updatedAt: string | Date;
};

export function buildResourceHref(skillId: string, resourcePath: string) {
  const encodedId = encodeURIComponent(skillId);
  const encodedPath = resourcePath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `/dashboard/skills/${encodedId}/resources/${encodedPath}` as Route;
}

export function ResourceHoverLink({
  resource,
  skillId,
  skillName,
  className,
  children,
}: {
  resource: ResourceLike;
  skillId: string;
  skillName?: string;
  className?: string;
  children?: ReactNode;
}) {
  const previewUnavailable = !canRenderResourceAsMarkdown(resource.path, resource.kind);

  return (
    <HoverCard>
      <HoverCardTrigger
        href={buildResourceHref(skillId, resource.path)}
        className={className ?? "text-primary underline underline-offset-4"}
      >
        {children ?? resource.path}
      </HoverCardTrigger>
      <HoverCardContent className="w-auto border-none bg-transparent p-0 shadow-none ring-0">
        <NodePreviewCard
          data={{
            label: resource.path,
            type: "resource",
            description: null,
            contentSnippet: previewUnavailable ? null : resource.content,
            slug: null,
            kind: resource.kind,
            parentSkillName: skillName ?? null,
            updatedAt: resource.updatedAt,
            previewUnavailable,
          }}
        />
      </HoverCardContent>
    </HoverCard>
  );
}
