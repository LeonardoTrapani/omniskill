import { Badge } from "@/components/ui/badge";
import type { SkillResourceReference } from "@/lib/skills/resource-links";
import { cn } from "@/lib/utils";

export function MobileResourceList({
  resources,
  onSelect,
  framed = true,
}: {
  resources: SkillResourceReference[];
  onSelect: (resource: SkillResourceReference) => void;
  framed?: boolean;
}) {
  if (resources.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[240px] items-center justify-center px-4 text-center",
          framed ? "border border-border" : "",
        )}
      >
        <p className="text-sm text-muted-foreground">No resources attached.</p>
      </div>
    );
  }

  return (
    <div className={cn("divide-y divide-border/40", framed ? "border border-border" : "")}>
      {resources.map((resource) => (
        <button
          key={resource.id}
          type="button"
          onClick={() => onSelect(resource)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
        >
          <span className="min-w-0 break-all text-[11px] text-foreground">{resource.path}</span>
          <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
            {resource.kind}
          </Badge>
        </button>
      ))}
    </div>
  );
}
