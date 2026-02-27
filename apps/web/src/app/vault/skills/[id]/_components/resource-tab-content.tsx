"use client";

import { useCallback, useMemo } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/markdown/markdown-components";
import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import {
  canRenderResourceAsMarkdown,
  getResourceDownloadName,
  getResourceMimeType,
} from "@/components/markdown/resource-file";
import { useResourceContent } from "@/hooks/skills/use-resource-tabs";
import {
  createResourceHrefResolver,
  type SkillResourceReference,
} from "@/lib/skills/resource-links";

export function ResourceTabContent({
  skillId,
  skillName,
  resourcePath,
  resources,
}: {
  skillId: string;
  skillName?: string;
  resourcePath: string;
  resources: SkillResourceReference[];
}) {
  const { data, isLoading, isError } = useResourceContent(skillId, resourcePath);

  const findResourceByHref = useMemo(() => createResourceHrefResolver(resources), [resources]);

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName,
        findResourceByHref,
      }),
    [skillId, skillName, findResourceByHref],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <FileText className="size-8 text-neutral-300" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Failed to load resource content.</p>
      </div>
    );
  }

  const canRender = canRenderResourceAsMarkdown(data.path, data.kind);
  const downloadName = getResourceDownloadName(data.path, `${data.id}.txt`);
  const mimeType = getResourceMimeType(data.path);

  const handleDownload = useCallback(() => {
    const blob = new Blob([data.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data.content, downloadName, mimeType]);

  const downloadAction = (
    <div className="mb-4 flex items-center justify-end">
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-muted-foreground transition-colors hover:text-foreground"
      >
        <Download className="size-3" aria-hidden="true" />
        DOWNLOAD FILE
      </button>
    </div>
  );

  if (!canRender) {
    return (
      <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
        {downloadAction}
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <FileText className="size-8 text-neutral-300" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">This file cannot be rendered as markdown.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
      {downloadAction}
      <article className="min-w-0 break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
          urlTransform={markdownUrlTransform}
        >
          {data.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
