"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_PERCENT = 30;
const MAX_PERCENT = 80;
const DEFAULT_PERCENT = 65;
const KEYBOARD_STEP = 1;

function clamp(value: number) {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));
}

export function useResizablePanel(initialPercent = DEFAULT_PERCENT) {
  const [splitPercent, setSplitPercent] = useState(clamp(initialPercent));
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSplitPercent(clamp(percent));
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSplitPercent((prev) => clamp(prev - KEYBOARD_STEP));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSplitPercent((prev) => clamp(prev + KEYBOARD_STEP));
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const leftStyle = { width: `${splitPercent}%` } as const;
  const rightStyle = { width: `${100 - splitPercent}%` } as const;

  const dividerProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onKeyDown: handleKeyDown,
    role: "separator" as const,
    "aria-orientation": "vertical" as const,
    "aria-valuenow": Math.round(splitPercent),
    "aria-valuemin": MIN_PERCENT,
    "aria-valuemax": MAX_PERCENT,
    tabIndex: 0,
  };

  return {
    splitPercent,
    leftStyle,
    rightStyle,
    dividerProps,
    isDragging,
    containerRef,
  };
}
