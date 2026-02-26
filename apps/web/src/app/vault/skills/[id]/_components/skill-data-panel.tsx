import { Info } from "lucide-react";

import { SkillPanel } from "@/components/skills/skill-panel";

function displayValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function SkillDataPanel({
  frontmatter,
  metadata,
}: {
  frontmatter: Array<[string, unknown]>;
  metadata: Array<[string, unknown]>;
}) {
  const allDataEntries = [...frontmatter, ...metadata];

  return (
    <SkillPanel
      icon={<Info className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      title="Skill Data"
      trailing={
        <span className="text-[10px] text-muted-foreground">
          {allDataEntries.length} field{allDataEntries.length !== 1 ? "s" : ""}
        </span>
      }
      collapsible
      defaultOpen={allDataEntries.length > 0}
      isEmpty={allDataEntries.length === 0}
    >
      <div className="px-5 py-4">
        {allDataEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data fields.</p>
        ) : (
          <div className="space-y-4">
            {frontmatter.length > 0 && (
              <div>
                <div className="space-y-1.5">
                  {frontmatter.map(([key, value]) => (
                    <div key={key} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-3">
                      <p className="text-xs text-muted-foreground break-words font-mono">{key}</p>
                      <p className="text-xs text-foreground break-words">{displayValue(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SkillPanel>
  );
}
