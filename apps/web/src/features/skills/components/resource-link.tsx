"use client";

import type { MouseEvent, ReactNode } from "react";

import { NodePreviewCard } from "@/features/skills/components/graph/node-preview-card";
import { canRenderResourceAsMarkdown } from "@/features/skills/components/resource-file";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  buildResourceHref,
  type SkillResourceReference,
} from "@/features/skills/lib/resource-links";

export type ResourceLike = SkillResourceReference;

export function ResourceHoverLink({
  resource,
  skillId,
  skillName,
  className,
  children,
  onNavigate,
}: {
  resource: ResourceLike;
  skillId: string;
  skillName?: string;
  className?: string;
  children?: ReactNode;
  onNavigate?: (event: MouseEvent<HTMLElement>, href: ReturnType<typeof buildResourceHref>) => void;
}) {
  const previewUnavailable = !canRenderResourceAsMarkdown(resource.path, resource.kind);
  const href = buildResourceHref(skillId, resource.path);

  return (
    <HoverCard>
      <HoverCardTrigger
        href={href}
        onClick={(event) => onNavigate?.(event, href)}
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
