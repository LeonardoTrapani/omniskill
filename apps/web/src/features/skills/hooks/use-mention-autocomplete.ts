"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/features/skills/hooks/use-skill-search";
import { trpc } from "@/shared/api/trpc";

export interface MentionItem {
  type: "skill" | "resource";
  id: string;
  label: string;
  subtitle: string | null;
  parentSkillId: string | null;
}

export interface MentionAutocompleteState {
  open: boolean;
  query: string;
  anchor: { top: number; left: number } | null;
  items: MentionItem[];
  selectedIndex: number;
  isLoading: boolean;
}

function detectActiveMention(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!range.collapsed) {
    return null;
  }

  if (!container.contains(range.startContainer)) {
    return null;
  }

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const text = node.textContent ?? "";
  const offset = range.startOffset;
  const textBeforeCursor = text.slice(0, offset);

  const triggerIndex = textBeforeCursor.lastIndexOf("[[");
  if (triggerIndex === -1) {
    return null;
  }

  const afterTrigger = textBeforeCursor.slice(triggerIndex + 2);
  if (afterTrigger.includes("]]")) {
    return null;
  }

  if (afterTrigger.includes("\n") || afterTrigger.length > 60) {
    return null;
  }

  const mentionRange = document.createRange();
  mentionRange.setStart(node, triggerIndex);
  mentionRange.setEnd(node, offset);

  return {
    query: afterTrigger,
    range: mentionRange,
  };
}

function getCaretRect(range: Range): { top: number; left: number } | null {
  const caretRange = range.cloneRange();
  caretRange.collapse(false);

  const rects = caretRange.getClientRects();
  const rect = rects[rects.length - 1] ?? caretRange.getBoundingClientRect();
  if (!rect) {
    return null;
  }

  return {
    top: rect.bottom,
    left: rect.left,
  };
}

export function useMentionAutocomplete(options: {
  skillId?: string;
  editorContainerRef: React.RefObject<HTMLElement | null>;
  onInsert: (item: MentionItem, mentionRange: Range, query: string) => void;
}) {
  const { skillId, editorContainerRef, onInsert } = options;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeMentionRange = useRef<Range | null>(null);

  const debouncedQuery = useDebouncedValue(query, 150);

  const { data, isLoading } = useQuery({
    ...trpc.skills.searchMentions.queryOptions({
      query: debouncedQuery,
      skillId,
      limit: 6,
    }),
    placeholderData: keepPreviousData,
    enabled: open && debouncedQuery.length >= 0,
  });

  const items = data?.items ?? [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery]);

  const checkForMention = useCallback(() => {
    const container = editorContainerRef.current;
    if (!container) {
      setOpen(false);
      return;
    }

    const result = detectActiveMention(container);

    if (result) {
      activeMentionRange.current = result.range;
      setQuery(result.query);

      const rect = getCaretRect(result.range);
      if (rect) {
        const containerRect = container.getBoundingClientRect();
        setAnchor({
          top: rect.top - containerRect.top + container.scrollTop,
          left: rect.left - containerRect.left + container.scrollLeft,
        });
      } else {
        setAnchor(null);
      }

      setOpen(true);
      return;
    }

    activeMentionRange.current = null;
    setOpen(false);
    setQuery("");
  }, [editorContainerRef]);

  const dismiss = useCallback(() => {
    activeMentionRange.current = null;
    setOpen(false);
    setQuery("");
  }, []);

  const insertSelected = useCallback(
    (index?: number) => {
      const idx = index ?? selectedIndex;
      const item = items[idx];
      const range = activeMentionRange.current;
      if (!item || !range) {
        return;
      }

      onInsert(item, range, query);
      dismiss();
    },
    [selectedIndex, items, onInsert, dismiss, query],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open || items.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((index) => Math.min(index + 1, items.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((index) => Math.max(index - 1, 0));
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        insertSelected();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
    },
    [open, items.length, insertSelected, dismiss],
  );

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) {
      return;
    }

    const onSelectionChange = () => {
      requestAnimationFrame(checkForMention);
    };

    const onEditorActivity = () => {
      requestAnimationFrame(checkForMention);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    container.addEventListener("keydown", handleKeyDown, { capture: true });
    container.addEventListener("input", onEditorActivity, { capture: true });
    container.addEventListener("keyup", onEditorActivity, { capture: true });
    container.addEventListener("click", onEditorActivity, { capture: true });

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      container.removeEventListener("keydown", handleKeyDown, { capture: true });
      container.removeEventListener("input", onEditorActivity, { capture: true });
      container.removeEventListener("keyup", onEditorActivity, { capture: true });
      container.removeEventListener("click", onEditorActivity, { capture: true });
    };
  }, [editorContainerRef, checkForMention, handleKeyDown]);

  return {
    open,
    query,
    anchor,
    items,
    selectedIndex,
    isLoading,
    setSelectedIndex,
    insertSelected,
    dismiss,
  };
}
