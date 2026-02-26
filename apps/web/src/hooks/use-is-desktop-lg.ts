"use client";

import { useEffect, useState } from "react";

/**
 * Responsive flag for desktop layout (`lg` breakpoint >= 1024px).
 * Defaults to false so SSR and first client render stay in sync.
 */
export function useIsDesktopLg() {
  const [isDesktopLg, setIsDesktopLg] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const update = () => setIsDesktopLg(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktopLg;
}
