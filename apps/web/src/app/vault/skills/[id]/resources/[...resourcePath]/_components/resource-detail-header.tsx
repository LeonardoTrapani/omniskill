import Link from "next/link";
import { ArrowUpRight, FileTerminal, FileText } from "lucide-react";

import { formatDisplayDate } from "@/lib/format-display-date";
import { buildSkillHref, dashboardRoute } from "@/lib/skills/routes";

export function ResourceDetailHeader({
  skillId,
  parentSkillName,
  resourcePath,
  resourceKind,
  updatedAt,
}: {
  skillId: string;
  parentSkillName: string;
  resourcePath: string;
  resourceKind: string;
  updatedAt: string | Date;
}) {
  return (
    <header className="space-y-5 pb-8">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <Link
            href={dashboardRoute}
            className="transition-colors duration-150 hover:text-foreground"
          >
            skills
          </Link>
          <span className="text-border">/</span>
          <Link
            href={buildSkillHref(skillId)}
            className="truncate transition-colors duration-150 hover:text-foreground"
          >
            {parentSkillName}
          </Link>
          <span className="text-border">/</span>
          <span className="truncate text-foreground">{resourcePath}</span>
        </nav>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold leading-tight text-foreground text-balance break-words sm:text-3xl">
          {resourcePath}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground break-words text-pretty">
          Child resource of{" "}
          <Link
            href={buildSkillHref(skillId)}
            className="text-primary underline-offset-4 hover:underline"
          >
            {parentSkillName}
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground font-mono">
        <span>Updated {formatDisplayDate(updatedAt)}</span>
        <span className="text-border">|</span>
        <Link
          href={buildSkillHref(skillId)}
          className="inline-flex items-center gap-0.5 text-primary transition-colors duration-150 hover:text-primary/80"
        >
          Parent Skill
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
