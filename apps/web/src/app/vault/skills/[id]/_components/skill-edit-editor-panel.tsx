import type { MutableRefObject, RefObject } from "react";

import type { MDXEditorMethods } from "@mdxeditor/editor";
import type { Route } from "next";

import MarkdownEditorLazy from "@/components/markdown/markdown-editor-lazy";
import MentionPopover from "@/components/skills/mention-popover";
import type { MentionItem } from "@/hooks/skills/use-mention-autocomplete";
import { resolveEditorNavigationHref } from "@/lib/skills/routes";

export function SkillEditEditorPanel({
  id,
  hasChanges,
  markdown,
  editorRef,
  editorContainerRef,
  mention,
  onChange,
  onNavigate,
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
  onChange: () => void;
  onNavigate: (href: Route) => void;
}) {
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={editorContainerRef}
        className="mdx-editor-wrapper relative"
        onClick={(event) => {
          if (!hasChanges) return;
          const anchor = (event.target as HTMLElement).closest("a[href]");
          if (!anchor) return;
          const href = anchor.getAttribute("href");
          if (href && href.startsWith("/")) {
            const routeHref = resolveEditorNavigationHref(id, href);
            if (!routeHref) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            onNavigate(routeHref);
          }
        }}
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
    </>
  );
}
