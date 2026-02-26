import type { MouseEvent } from "react";

import { ResourceHoverLink, type ResourceLike } from "@/components/skills/resource-link";
import { Badge } from "@/components/ui/badge";
import type { buildResourceHref } from "@/lib/skills/resource-links";

export function ResourceList({
  resources,
  skillId,
  skillName,
  emptyMessage,
  onNavigate,
}: {
  resources: ResourceLike[];
  skillId: string;
  skillName?: string;
  emptyMessage: string;
  onNavigate?: (event: MouseEvent<HTMLElement>, href: ReturnType<typeof buildResourceHref>) => void;
}) {
  if (resources.length === 0) {
    return <p className="px-5 py-4 text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div>
      {resources.map((resource, idx) => (
        <div
          key={resource.id}
          className={`flex items-center justify-between gap-3 px-5 py-2.5 ${
            idx < resources.length - 1 ? "border-b border-border/40" : ""
          }`}
        >
          <ResourceHoverLink
            resource={resource}
            skillId={skillId}
            skillName={skillName}
            className="min-w-0 break-all text-xs text-primary underline-offset-4 hover:underline"
            onNavigate={onNavigate}
          >
            {resource.path}
          </ResourceHoverLink>
          <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
            {resource.kind}
          </Badge>
        </div>
      ))}
    </div>
  );
}
