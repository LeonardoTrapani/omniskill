"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Search, Zap } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { MentionDropdownState } from "@/hooks/use-mention-autocomplete";

// ---------------------------------------------------------------------------
// Dropdown (skill picker that opens above @)
// ---------------------------------------------------------------------------

export function MentionDropdown({
  isOpen,
  position,
  skills,
  selectedIndex,
  isLoading,
  query,
  onSelect,
  onHover,
}: MentionDropdownState) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const item = containerRef.current.querySelector(`[data-mention-index="${selectedIndex}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [isOpen, selectedIndex]);

  if (!isOpen) return null;

  return createPortal(
    <div
      data-mention-dropdown
      ref={containerRef}
      className="bg-popover text-popover-foreground ring-foreground/10 z-50 w-64 rounded-md shadow-md ring-1"
      style={{
        position: "fixed",
        bottom: position.bottom,
        left: position.left,
      }}
    >
      {/* Search bar (display-only, not a real input) */}
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <Search className="size-3 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs text-muted-foreground">
          {query || "Search skills..."}
        </span>
      </div>

      {/* Skills list */}
      <div className="max-h-[200px] overflow-y-auto py-1">
        {isLoading && skills.length === 0 && (
          <div className="flex items-center justify-center py-4">
            <Spinner />
          </div>
        )}

        {!isLoading && skills.length === 0 && (
          <div className="px-2 py-3 text-center text-xs text-muted-foreground">No skills found</div>
        )}

        {skills.map((skill, index) => (
          <div
            key={skill.id}
            data-mention-index={index}
            className={cn(
              "flex cursor-default items-start gap-2 px-2 py-1.5 text-xs",
              index === selectedIndex && "bg-foreground/[0.06]",
            )}
            onMouseDown={(e) => {
              e.preventDefault(); // Keep focus on textarea
              onSelect(index);
            }}
            onMouseEnter={() => onHover(index)}
          >
            <Zap className="mt-0.5 size-3 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{skill.name}</div>
              {skill.description && (
                <div className="truncate text-muted-foreground">{skill.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Text overlay — mirrors textarea content, renders mentions as pills
// ---------------------------------------------------------------------------

const STYLE_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "wordSpacing",
  "textIndent",
  "tabSize",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
] as const;

interface OverlaySegment {
  type: "text" | "mention";
  text: string;
  name?: string;
}

interface MentionTextOverlayProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  segments: OverlaySegment[];
}

export function MentionTextOverlay({ textareaRef, segments }: MentionTextOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [fontStyles, setFontStyles] = useState<Record<string, string> | null>(null);

  // Track textarea position, size, and computed styles
  const syncLayout = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    setRect(ta.getBoundingClientRect());
    const cs = getComputedStyle(ta);
    const s: Record<string, string> = {};
    for (const prop of STYLE_PROPS) {
      s[prop] = cs.getPropertyValue(prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`));
    }
    setFontStyles(s);
  }, [textareaRef]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    syncLayout();

    const ro = new ResizeObserver(syncLayout);
    ro.observe(ta);

    return () => ro.disconnect();
  }, [textareaRef, syncLayout]);

  // Sync scroll position
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const sync = () => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = ta.scrollTop;
        overlayRef.current.scrollLeft = ta.scrollLeft;
      }
    };
    ta.addEventListener("scroll", sync);
    return () => ta.removeEventListener("scroll", sync);
  }, [textareaRef]);

  if (segments.length === 0 || !rect || !fontStyles) return null;

  return createPortal(
    <div
      ref={overlayRef}
      aria-hidden
      style={{
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        overflow: "hidden",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        boxSizing: "border-box",
        zIndex: 1,
        // Transparent borders — occupies same space as textarea borders
        borderTop: `${fontStyles.borderTopWidth} solid transparent`,
        borderRight: `${fontStyles.borderRightWidth} solid transparent`,
        borderBottom: `${fontStyles.borderBottomWidth} solid transparent`,
        borderLeft: `${fontStyles.borderLeftWidth} solid transparent`,
        // Clone font / spacing / padding
        fontFamily: fontStyles.fontFamily,
        fontSize: fontStyles.fontSize,
        fontWeight: fontStyles.fontWeight,
        fontStyle: fontStyles.fontStyle,
        letterSpacing: fontStyles.letterSpacing,
        lineHeight: fontStyles.lineHeight,
        textTransform: fontStyles.textTransform as React.CSSProperties["textTransform"],
        wordSpacing: fontStyles.wordSpacing,
        textIndent: fontStyles.textIndent,
        tabSize: fontStyles.tabSize,
        paddingTop: fontStyles.paddingTop,
        paddingRight: fontStyles.paddingRight,
        paddingBottom: fontStyles.paddingBottom,
        paddingLeft: fontStyles.paddingLeft,
      }}
    >
      {segments.map((seg, i) =>
        seg.type === "mention" ? (
          <span
            key={i}
            style={{
              background: "hsl(var(--foreground) / 0.10)",
              borderRadius: "4px",
              color: "hsl(var(--primary))",
              boxShadow:
                "-3px 0 0 0 hsl(var(--foreground) / 0.10), 3px 0 0 0 hsl(var(--foreground) / 0.10)",
            }}
          >
            {/* Replace the @ with a visible dot — same char width, styled differently */}
            <span style={{ color: "transparent", position: "relative" }}>
              @
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "hsl(var(--primary) / 0.6)",
                  fontSize: "7px",
                  pointerEvents: "none",
                }}
              >
                ●
              </span>
            </span>
            {seg.name}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </div>,
    document.body,
  );
}
