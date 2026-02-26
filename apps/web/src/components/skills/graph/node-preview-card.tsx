import { FileTerminal, FileText, Hexagon, Package } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import { formatDisplayDate } from "@/lib/format-display-date";
import { cn } from "@/lib/utils";

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
        "w-[340px] overflow-hidden border border-border bg-popover text-popover-foreground shadow-sm",
        className,
      )}
    >
      {/* ── Header ── */}
      <div className="px-3.5 pt-3 pb-2.5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/50">
              {isSkill ? (
                <Hexagon className="size-3 text-muted-foreground" />
              ) : data.previewUnavailable ? (
                <FileTerminal className="size-3 text-muted-foreground" />
              ) : (
                <FileText className="size-3 text-muted-foreground" />
              )}
            </div>
            <p className="min-w-0 truncate text-[13px] font-medium tracking-tight">{data.label}</p>
          </div>
          <span className="shrink-0 border border-border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.08em] text-muted-foreground">
            {isSkill ? "skill" : kindKey}
          </span>
        </div>
      </div>

      {/* ── Metadata bar ── */}
      {isSkill ? (
        <div className="flex items-center gap-3 border-t border-border px-3.5 py-2 text-[10px] font-mono text-muted-foreground/70">
          {data.updatedAt ? <span>Updated {formatDisplayDate(data.updatedAt)}</span> : null}
          {data.updatedAt && typeof data.resourceCount === "number" ? (
            <span className="text-border">|</span>
          ) : null}
          {typeof data.resourceCount === "number" ? (
            <span className="flex items-center gap-1">
              <Package className="size-2.5" />
              {data.resourceCount} resource{data.resourceCount !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      {!isSkill && data.parentSkillName ? (
        <div className="flex items-center gap-2 border-t border-border px-3.5 py-2 text-[10px] font-mono text-muted-foreground/70">
          <Hexagon className="size-2.5 shrink-0" />
          <span className="truncate">Parent: {data.parentSkillName}</span>
        </div>
      ) : null}

      {/* ── Content preview ── */}
      <div className="border-t border-border">
        {data.previewUnavailable ? (
          <div className="flex flex-col items-center justify-center gap-1.5 px-3.5 py-5">
            <FileTerminal className="size-4 text-muted-foreground/40" />
            <p className="text-[11px] font-mono text-muted-foreground/60">
              Preview not available for this file type
            </p>
          </div>
        ) : snippet ? (
          <div className="px-3.5 py-2.5">
            <article className="prose prose-sm max-w-none overflow-hidden text-[11px] leading-[1.6] text-muted-foreground prose-p:my-0.5 prose-code:rounded-none prose-code:border prose-code:border-border prose-code:bg-muted/40 prose-code:px-1 prose-code:py-0.5 prose-code:text-[10px] [&_*]:max-w-full [&_a]:break-all [&_code]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_ul]:pl-4 [&_ol]:pl-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>
                {snippet}
              </ReactMarkdown>
            </article>
          </div>
        ) : (
          <div className="flex items-center justify-center px-3.5 py-4">
            <p className="text-[11px] font-mono text-neutral-300">No content</p>
          </div>
        )}
      </div>
    </div>
  );
}
