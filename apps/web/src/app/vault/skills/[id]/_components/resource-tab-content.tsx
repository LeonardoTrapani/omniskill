"use client";

import { useMemo } from "react";
import { FileText, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createMarkdownComponents } from "@/components/markdown/markdown-components";
import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import { canRenderResourceAsMarkdown } from "@/components/markdown/resource-file";
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
  onResourceNavigate,
}: {
  skillId: string;
  skillName?: string;
  resourcePath: string;
  resources: SkillResourceReference[];
  onResourceNavigate?: (resource: SkillResourceReference) => void;
}) {
  const { data, isLoading, isError } = useResourceContent(skillId, resourcePath);

  const findResourceByHref = useMemo(() => createResourceHrefResolver(resources), [resources]);

  const markdownComponents = useMemo(
    () =>
      createMarkdownComponents({
        skillId,
        skillName,
        findResourceByHref,
        onResourceNavigate,
      }),
    [skillId, skillName, findResourceByHref, onResourceNavigate],
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

  if (!canRender) {
    return (
      <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <FileText className="size-8 text-neutral-300" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">This file cannot be rendered as markdown.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 xl:px-12 py-8">
      <article className="min-w-0 break-words lg:mt-3">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={markdownComponents}
          urlTransform={markdownUrlTransform}
        >
          {data.renderedContent}
        </ReactMarkdown>
      </article>
    </div>
  );
}
