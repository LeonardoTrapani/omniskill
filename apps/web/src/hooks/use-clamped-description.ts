"use client";

import { useEffect, useRef, useState } from "react";

export function useClampedDescription(text?: string) {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element || expanded) return;

    const measureOverflow = () => {
      setHasOverflow(element.scrollHeight > element.clientHeight + 1);
    };

    measureOverflow();

    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [expanded, text]);

  return {
    contentRef,
    expanded,
    setExpanded,
    hasOverflow,
  };
}
