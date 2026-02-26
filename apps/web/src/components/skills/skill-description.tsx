"use client";

import { useClampedDescription } from "@/hooks/skills/use-clamped-description";

export function SkillDescription({ description }: { description?: string | null }) {
  const { contentRef, expanded, setExpanded, hasOverflow } = useClampedDescription(
    description ?? undefined,
  );

  if (!description) {
    return null;
  }

  return (
    <div>
      <p
        ref={contentRef}
        className={[
          "text-sm leading-relaxed text-muted-foreground break-words text-pretty",
          expanded
            ? ""
            : "[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {description}
      </p>
      {hasOverflow && (
        <button
          type="button"
          className="mt-1 text-[11px] text-primary transition-colors duration-150 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => setExpanded((prev) => !prev)}
          aria-label={expanded ? "Collapse description" : "Expand description"}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
