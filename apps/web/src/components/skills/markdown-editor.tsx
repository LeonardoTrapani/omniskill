"use client";

import type { ForwardedRef } from "react";
import { useTheme } from "next-themes";
import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

export interface MarkdownEditorProps extends Omit<MDXEditorProps, "plugins"> {
  editorRef?: ForwardedRef<MDXEditorMethods>;
}

export default function MarkdownEditor({ editorRef, ...props }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <MDXEditor
      className={resolvedTheme === "dark" ? "dark-theme dark-editor px-5 py-5" : "px-5 py-5"}
      contentEditableClassName="mdx-editor-content"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            "": "Plain text",
            js: "JavaScript",
            ts: "TypeScript",
            jsx: "JSX",
            tsx: "TSX",
            css: "CSS",
            html: "HTML",
            json: "JSON",
            python: "Python",
            bash: "Bash",
            yaml: "YAML",
            markdown: "Markdown",
          },
        }),
        markdownShortcutPlugin(),
      ]}
      {...props}
      ref={editorRef}
    />
  );
}
