import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { markdownUrlTransform } from "@/features/skills/components/markdown-url-transform";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/shared/lib/format-display-date";
import { cn } from "@/shared/lib/utils";

export interface NodePreviewData {
  label: string;
  type: "skill" | "resource";
  description: string | null;
  contentSnippet: string | null;
  slug: string | null;
  kind: string | null;
  parentSkillName: string | null;
  updatedAt: string | Date | null;
  resourceCount?: number;
  previewUnavailable?: boolean;
}

interface NodePreviewCardProps {
  data: NodePreviewData;
  className?: string;
}

export function NodePreviewCard({ data, className }: NodePreviewCardProps) {
  const isSkill = data.type === "skill";
  const kindKey = data.kind ?? "other";
  const skillPreviewRaw = data.description?.trim() || data.contentSnippet?.trim() || null;
  const resourcePreviewRaw = data.contentSnippet?.trim() || null;
  const previewRaw = isSkill ? skillPreviewRaw : resourcePreviewRaw;
  const snippet = previewRaw
    ? previewRaw.length > 220
      ? `${previewRaw.slice(0, 220)}...`
      : previewRaw
    : null;

  return (
    <div
      className={cn(
        "w-[360px] overflow-hidden rounded-none border border-border bg-popover text-popover-foreground",
        className,
      )}
    >
      <div className="p-3 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <p className="min-w-0 truncate text-sm font-semibold tracking-tight">{data.label}</p>
            {!isSkill && data.parentSkillName ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                Parent skill: {data.parentSkillName}
              </p>
            ) : null}
          </div>
          <Badge variant="outline" className="shrink-0 uppercase tracking-[0.08em] text-[10px]">
            {isSkill ? "skill" : kindKey}
          </Badge>
        </div>

        {isSkill ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {data.updatedAt ? <span>Updated {formatDisplayDate(data.updatedAt)}</span> : null}
            {typeof data.resourceCount === "number" ? (
              <span>
                {data.resourceCount} linked resource{data.resourceCount !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 border border-border bg-background p-2.5 min-w-0">
          {data.previewUnavailable ? (
            <p className="text-xs text-muted-foreground">This file cannot be rendered.</p>
          ) : snippet ? (
            <article className="prose prose-sm max-w-none overflow-hidden text-xs leading-5 prose-p:my-1 prose-code:rounded-none prose-code:border prose-code:border-border prose-code:bg-muted/40 prose-code:px-1 prose-code:py-0.5 [&_*]:max-w-full [&_a]:break-all [&_code]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_ul]:pl-4 [&_ol]:pl-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>
                {snippet}
              </ReactMarkdown>
            </article>
          ) : (
            <p className="text-xs text-muted-foreground">(empty)</p>
          )}
        </div>
      </div>
    </div>
  );
}
