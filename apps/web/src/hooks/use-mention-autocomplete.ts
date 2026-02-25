"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { useDebouncedValue } from "@/hooks/use-skill-search";

export interface MentionItem {
  type: "skill" | "resource";
  id: string;
  label: string;
  subtitle: string | null;
  parentSkillId: string | null;
}

export interface MentionAutocompleteState {
  /** Whether the popover should be open */
  open: boolean;
  /** The query text after `[[` */
  query: string;
  /** Pixel position to anchor the popover */
  anchor: { top: number; left: number } | null;
  /** Results from the API */
  items: MentionItem[];
  /** Currently highlighted index */
  selectedIndex: number;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Scans the current selection inside a contenteditable element for an active
 * `[[query` pattern (un-closed mention trigger). Returns the query text and
 * the Range covering the `[[query` portion, or null if no active mention.
 */
function detectActiveMention(container: HTMLElement) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return null;

  // Make sure the cursor is inside our editor container
  if (!container.contains(range.startContainer)) return null;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent ?? "";
  const offset = range.startOffset;
  const textBeforeCursor = text.slice(0, offset);

  // Find the last `[[` that is NOT closed by `]]`
  const triggerIndex = textBeforeCursor.lastIndexOf("[[");
  if (triggerIndex === -1) return null;

  const afterTrigger = textBeforeCursor.slice(triggerIndex + 2);

  // If there's a `]]` after the `[[`, the mention is closed — no autocomplete
  if (afterTrigger.includes("]]")) return null;

  // Don't trigger on newlines or if the query is too long
  if (afterTrigger.includes("\n") || afterTrigger.length > 60) return null;

  // Build a range spanning from `[[` to cursor
  const mentionRange = document.createRange();
  mentionRange.setStart(node, triggerIndex);
  mentionRange.setEnd(node, offset);

  return {
    query: afterTrigger,
    range: mentionRange,
  };
}

function getCaretRect(range: Range): { top: number; left: number } | null {
  // Measure the collapsed caret position (end of the active mention)
  // so the popover appears right under where the user is typing.
  const caretRange = range.cloneRange();
  caretRange.collapse(false);

  const rects = caretRange.getClientRects();
  const rect = rects[rects.length - 1] ?? caretRange.getBoundingClientRect();
  if (!rect) return null;

  // Popover uses `position: fixed`, so use viewport coordinates.
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

  // Reset selection when results change
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
    } else {
      activeMentionRange.current = null;
      setOpen(false);
      setQuery("");
    }
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
      if (!item || !range) return;
      onInsert(item, range, query);
      dismiss();
    },
    [selectedIndex, items, onInsert, dismiss, query],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        insertSelected();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }
    },
    [open, items.length, insertSelected, dismiss],
  );

  // Listen for selection changes + editing activity on the editor container
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const onSelectionChange = () => {
      // Use requestAnimationFrame to ensure DOM is settled
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
