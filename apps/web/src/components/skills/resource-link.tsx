"use client";

import type { MouseEvent, ReactNode } from "react";

import { NodePreviewCard } from "@/components/skills/graph/node-preview-card";
import { canRenderResourceAsMarkdown } from "@/components/markdown/resource-file";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { buildResourceHref, type SkillResourceReference } from "@/lib/skills/resource-links";
import { buildResourceResponsiveHref } from "@/lib/skills/routes";
import { useIsDesktopLg } from "@/hooks/use-is-desktop-lg";

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
  const isDesktopLg = useIsDesktopLg();
  const href = buildResourceResponsiveHref(skillId, resource.path, isDesktopLg);

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
