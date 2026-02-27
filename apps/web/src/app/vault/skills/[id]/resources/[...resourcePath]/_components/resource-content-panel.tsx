import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { DownloadContentButton } from "@/components/skills/download-content-button";
import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import { SkillPanel } from "@/components/skills/skill-panel";

export function ResourceContentPanel({
  canRenderMarkdown,
  renderedContent,
  rawContent,
  markdownComponents,
  downloadName,
  mimeType,
}: {
  canRenderMarkdown: boolean;
  renderedContent: string;
  rawContent: string;
  markdownComponents: Parameters<typeof ReactMarkdown>[0]["components"];
  downloadName: string;
  mimeType: string;
}) {
  return canRenderMarkdown ? (
    <div className="p-5">
      <article className="min-w-0 break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
          urlTransform={markdownUrlTransform}
        >
          {renderedContent}
        </ReactMarkdown>
      </article>
    </div>
  ) : (
    <SkillPanel
      icon={<FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />}
      title="Resource Content"
    >
      <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-5 py-8 text-center">
        <FileText className="size-8 text-neutral-300" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">This file cannot be rendered.</p>
        <DownloadContentButton
          content={rawContent}
          fileName={downloadName}
          mimeType={mimeType}
          variant="outline"
          size="sm"
          label="Download File"
        />
      </div>
    </SkillPanel>
  );
}
