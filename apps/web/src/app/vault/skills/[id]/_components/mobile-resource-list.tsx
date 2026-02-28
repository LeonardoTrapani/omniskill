import { Badge } from "@/components/ui/badge";
import type { SkillResourceReference } from "@/lib/skills/resource-links";

export function MobileResourceList({
  resources,
  onSelect,
}: {
  resources: SkillResourceReference[];
  onSelect: (resource: SkillResourceReference) => void;
}) {
  if (resources.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">No resources attached.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40 border border-border">
      {resources.map((resource) => (
        <button
          key={resource.id}
          type="button"
          onClick={() => onSelect(resource)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/30"
        >
          <span className="min-w-0 break-all text-xs text-foreground">{resource.path}</span>
          <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
            {resource.kind}
          </Badge>
        </button>
      ))}
    </div>
  );
}
