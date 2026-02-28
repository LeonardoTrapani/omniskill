"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { NodePreviewCard } from "@/components/skills/graph/node-preview-card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { trpc } from "@/lib/api/trpc";
import { buildSkillHref } from "@/lib/skills/routes";

export function SkillHoverLink({
  skillId,
  className,
  children,
}: {
  skillId: string;
  className?: string;
  children?: ReactNode;
}) {
  const { data } = useQuery(trpc.skills.getById.queryOptions({ id: skillId }));
  const href = buildSkillHref(skillId);

  return (
    <HoverCard>
      <HoverCardTrigger
        href={href}
        className={className ?? "text-primary underline underline-offset-4"}
      >
        {children ?? data?.name ?? skillId}
      </HoverCardTrigger>
      <HoverCardContent className="w-auto border-none bg-transparent p-0 shadow-none ring-0">
        <NodePreviewCard
          data={{
            label: data?.name ?? skillId,
            type: "skill",
            description: data?.description ?? null,
            contentSnippet: data?.renderedMarkdown ?? data?.originalMarkdown ?? null,
            slug: data?.slug ?? null,
            kind: null,
            parentSkillName: null,
            updatedAt: data?.updatedAt ?? null,
            resourceCount: data?.resources?.length,
          }}
        />
      </HoverCardContent>
    </HoverCard>
  );
}
