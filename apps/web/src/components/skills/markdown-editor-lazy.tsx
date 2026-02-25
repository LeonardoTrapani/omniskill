"use client";

import dynamic from "next/dynamic";
import type { MarkdownEditorProps } from "./markdown-editor";

const MarkdownEditor = dynamic(() => import("./markdown-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center border border-border bg-background/90">
      <p className="text-xs text-muted-foreground">Loading editor...</p>
    </div>
  ),
});

export default function MarkdownEditorLazy(props: MarkdownEditorProps) {
  return <MarkdownEditor {...props} />;
}
