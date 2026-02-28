import {
  useState,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type RefObject,
} from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import type { Route } from "next";

import MarkdownEditorLazy from "@/components/markdown/markdown-editor-lazy";
import { markdownUrlTransform } from "@/components/markdown/markdown-url-transform";
import MentionPopover from "@/components/skills/mention-popover";
import type { MentionItem } from "@/hooks/skills/use-mention-autocomplete";
import { resolveEditorNavigationHref } from "@/lib/skills/routes";

type ViewMode = "write" | "preview" | "split";

function ModeButton({
  active,
  label,
  onClick,
  className,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-6 items-center px-2 text-[10px] font-mono uppercase tracking-[0.08em] transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  );
}

export function SkillEditEditorPanel({
  id,
  hasChanges,
  markdown,
  editorRef,
  editorContainerRef,
  mention,
  onChange,
  onNavigate,
  previewMarkdown,
  previewComponents,
}: {
  id: string;
  hasChanges: boolean;
  markdown: string;
  editorRef: RefObject<MDXEditorMethods | null>;
  editorContainerRef: MutableRefObject<HTMLDivElement | null>;
  mention: {
    open: boolean;
    anchor: { top: number; left: number } | null;
    items: MentionItem[];
    selectedIndex: number;
    isLoading: boolean;
    query: string;
    insertSelected: (index?: number) => void;
    setSelectedIndex: (index: number) => void;
  };
  onChange: (markdown: string) => void;
  onNavigate: (href: Route) => void;
  previewMarkdown: string;
  previewComponents: Components;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("write");

  const showEditor = viewMode !== "preview";
  const showPreview = viewMode !== "write";

  const handleProtectedNavigation = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.defaultPrevented || !hasChanges) return;

    const anchor = (event.target as HTMLElement).closest("a[href]");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href || !href.startsWith("/")) return;

    const routeHref = resolveEditorNavigationHref(id, href);
    if (!routeHref) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onNavigate(routeHref);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-mono text-muted-foreground">
          [[ to link, cmd/ctrl+s to save
        </p>
        <div className="inline-flex items-center border border-border/70 bg-background/80">
          <ModeButton
            active={viewMode === "write"}
            label="Write"
            onClick={() => setViewMode("write")}
          />
          <ModeButton
            active={viewMode === "preview"}
            label="Preview"
            onClick={() => setViewMode("preview")}
            className="border-l border-border/70"
          />
          <ModeButton
            active={viewMode === "split"}
            label="Split"
            onClick={() => setViewMode("split")}
            className="hidden border-l border-border/70 lg:inline-flex"
          />
        </div>
      </div>

      <div
        className={
          viewMode === "split" ? "space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0" : ""
        }
      >
        {showEditor && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            ref={editorContainerRef}
            className="mdx-editor-wrapper relative"
            onClick={handleProtectedNavigation}
          >
            <MarkdownEditorLazy
              editorRef={editorRef}
              overlayContainer={editorContainerRef.current}
              markdown={markdown}
              onChange={onChange}
            />
            <MentionPopover
              open={mention.open}
              anchor={mention.anchor}
              items={mention.items}
              selectedIndex={mention.selectedIndex}
              isLoading={mention.isLoading}
              query={mention.query}
              onSelect={(index) => mention.insertSelected(index)}
              onHover={(index) => mention.setSelectedIndex(index)}
            />
          </div>
        )}

        {showPreview && (
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div
            className="min-h-[320px] border border-border/70 bg-background/70 p-4"
            onClick={handleProtectedNavigation}
          >
            {previewMarkdown.trim().length > 0 ? (
              <article className="min-w-0 break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={previewComponents}
                  urlTransform={markdownUrlTransform}
                >
                  {previewMarkdown}
                </ReactMarkdown>
              </article>
            ) : (
              <p className="text-xs text-muted-foreground">
                Preview will appear once you start writing.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
