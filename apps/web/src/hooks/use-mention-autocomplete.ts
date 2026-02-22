"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillItem {
  id: string;
  name: string;
  description: string | null;
}

export interface MentionDropdownState {
  isOpen: boolean;
  position: { bottom: number; left: number };
  skills: SkillItem[];
  selectedIndex: number;
  isLoading: boolean;
  query: string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

interface UseMentionAutocompleteOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onValueChange: (v: string) => void;
}

// ---------------------------------------------------------------------------
// Caret-position helper (mirror-div technique)
// ---------------------------------------------------------------------------

function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number } {
  const div = document.createElement("div");
  const style = getComputedStyle(textarea);

  const properties = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "textTransform",
    "wordSpacing",
    "textIndent",
    "boxSizing",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "lineHeight",
    "tabSize",
  ] as const;

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "hidden";
  div.style.width = `${textarea.offsetWidth}px`;
  div.style.height = `${textarea.offsetHeight}px`;

  for (const prop of properties) {
    (div.style as unknown as Record<string, string>)[prop] = style.getPropertyValue(
      prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
    );
  }

  const textBefore = textarea.value.slice(0, position);
  const textNode = document.createTextNode(textBefore);
  div.appendChild(textNode);

  const span = document.createElement("span");
  span.textContent = textarea.value.slice(position) || ".";
  div.appendChild(span);

  document.body.appendChild(div);

  const rect = textarea.getBoundingClientRect();
  const top = rect.top + span.offsetTop - textarea.scrollTop;
  const left = rect.left + span.offsetLeft - textarea.scrollLeft;

  document.body.removeChild(div);

  return { top, left };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMentionAutocomplete({
  textareaRef,
  value,
  onValueChange,
}: UseMentionAutocompleteOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerIndex, setTriggerIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ bottom: 0, left: 0 });

  // Mentions tracking: skill name → skill id
  const [mentionsMap, setMentionsMap] = useState<Map<string, string>>(() => new Map());

  const hasMentions = mentionsMap.size > 0;

  // Keep a ref to mentionsMap so detectTrigger can read the latest without
  // needing it in its dependency array (avoids callback churn).
  const mentionsMapRef = useRef(mentionsMap);
  mentionsMapRef.current = mentionsMap;

  // Clean up stale mentions when text changes
  useEffect(() => {
    if (mentionsMap.size === 0) return;
    setMentionsMap((prev) => {
      let changed = false;
      const next = new Map(prev);
      for (const [name] of next) {
        if (!value.includes(`@${name}`)) {
          next.delete(name);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [value, mentionsMap.size]);

  // Build submit value: replace @SkillName with @SkillName [[skill:uuid]]
  const getSubmitValue = useCallback(
    (text: string): string => {
      let result = text;
      for (const [name, id] of mentionsMap) {
        result = result.replaceAll(`@${name}`, `@${name} [[skill:${id}]]`);
      }
      return result;
    },
    [mentionsMap],
  );

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // tRPC query
  const { data, isLoading } = useQuery(
    trpc.skills.listByOwner.queryOptions({
      limit: 5,
      search: debouncedQuery.trim() || undefined,
    }),
  );

  const skills: SkillItem[] = (data?.items ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (textareaRef.current?.contains(target)) return;
      const dropdown = document.querySelector("[data-mention-dropdown]");
      if (dropdown?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, textareaRef]);

  // -----------------------------------------------------------------------
  // Detect @ trigger on change
  // -----------------------------------------------------------------------

  const detectTrigger = useCallback(
    (newValue: string, cursorPos: number) => {
      let i = cursorPos - 1;
      while (i >= 0) {
        const ch = newValue[i];
        if (ch === "@") {
          if (i === 0 || /\s/.test(newValue[i - 1]!)) {
            // Skip this @ if it belongs to a confirmed mention.
            // e.g. value = "@Drizzle ORM hello", @ at 0 → textFromAt = "Drizzle ORM hello"
            // confirmed name "Drizzle ORM" → textFromAt starts with it → skip.
            const textFromAt = newValue.slice(i + 1);
            const isConfirmed = Array.from(mentionsMapRef.current.keys()).some((name) =>
              textFromAt.startsWith(name),
            );
            if (isConfirmed) {
              break;
            }

            const afterAt = newValue.slice(i + 1, cursorPos);
            if (!afterAt.includes("\n")) {
              setIsOpen(true);
              setTriggerIndex(i);
              setQuery(afterAt);
              setSelectedIndex(0);

              if (textareaRef.current) {
                const coords = getCaretCoordinates(textareaRef.current, i);
                setPosition({
                  bottom: window.innerHeight - coords.top + 4,
                  left: coords.left,
                });
              }
              return;
            }
          }
          break;
        }
        if (ch === "\n") break;
        i--;
      }
      setIsOpen(false);
    },
    [textareaRef],
  );

  // -----------------------------------------------------------------------
  // Insert mention — only @SkillName (no [[skill:uuid]] in the textarea)
  // -----------------------------------------------------------------------

  const insertMention = useCallback(
    (skillIndex: number) => {
      const skill = skills[skillIndex];
      if (!skill) return;

      const before = value.slice(0, triggerIndex);
      const after = value.slice(triggerIndex + 1 + query.length);
      const display = `@${skill.name} `;
      const newValue = before + display + after;

      // Track the mention
      setMentionsMap((prev) => new Map(prev).set(skill.name, skill.id));

      onValueChange(newValue);
      setIsOpen(false);

      const cursorPos = before.length + display.length;
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(cursorPos, cursorPos);
        }
      });
    },
    [skills, value, triggerIndex, query, onValueChange, textareaRef],
  );

  // -----------------------------------------------------------------------
  // Handlers returned to the consumer
  // -----------------------------------------------------------------------

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.currentTarget.value;
      onValueChange(newValue);
      const cursorPos = e.currentTarget.selectionStart ?? newValue.length;
      detectTrigger(newValue, cursorPos);
    },
    [onValueChange, detectTrigger],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(skills.length, 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev <= 0 ? Math.max(skills.length - 1, 0) : prev - 1));
        return;
      }

      if (e.key === "Tab" || e.key === "Enter") {
        if (skills.length > 0) {
          e.preventDefault();
          insertMention(selectedIndex);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [isOpen, skills.length, selectedIndex, insertMention],
  );

  const onSelect = useCallback(
    (index: number) => {
      insertMention(index);
    },
    [insertMention],
  );

  const onHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // -----------------------------------------------------------------------
  // Overlay segments: split value into text / mention parts
  // -----------------------------------------------------------------------

  const overlaySegments = useMemo(() => {
    if (mentionsMap.size === 0) return [];

    const names = Array.from(mentionsMap.keys()).sort((a, b) => b.length - a.length);
    const pattern = names.map((n) => `@${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).join("|");
    const regex = new RegExp(`(${pattern})`);
    const parts = value.split(regex);

    return parts.map((part) => {
      const name = part.startsWith("@") ? part.slice(1) : null;
      if (name && mentionsMap.has(name)) {
        return { type: "mention" as const, text: part, name };
      }
      return { type: "text" as const, text: part };
    });
  }, [value, mentionsMap]);

  return {
    handleKeyDown,
    handleChange,
    hasMentions,
    getSubmitValue,
    overlaySegments,
    dropdown: {
      isOpen,
      position,
      skills,
      selectedIndex,
      isLoading,
      query,
      onSelect,
      onHover,
    } satisfies MentionDropdownState,
  };
}
