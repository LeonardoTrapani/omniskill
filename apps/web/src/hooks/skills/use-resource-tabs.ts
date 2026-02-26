"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  canRenderResourceAsMarkdown,
  getResourceDownloadName,
  getResourceMimeType,
} from "@/components/markdown/resource-file";
import type { SkillResourceReference } from "@/lib/skills/resource-links";
import { trpc } from "@/lib/api/trpc";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SkillTab {
  kind: "skill";
  id: string;
  label: string;
}

export interface ResourceTab {
  kind: "resource";
  /** The resource id (for graph highlighting) */
  id: string;
  /** The resource path (for display + query param) */
  path: string;
  /** Display label (last segment of path) */
  label: string;
}

export type ContentTab = SkillTab | ResourceTab;

/* ------------------------------------------------------------------ */
/*  Hook: single resource content fetch                                */
/* ------------------------------------------------------------------ */

export function useResourceContent(skillId: string, resourcePath: string | null) {
  return useQuery({
    ...trpc.skills.getResourceBySkillIdAndPath.queryOptions({
      skillId,
      resourcePath: resourcePath ?? "",
    }),
    enabled: resourcePath !== null,
  });
}

/* ------------------------------------------------------------------ */
/*  Hook: resource tab manager                                         */
/* ------------------------------------------------------------------ */

export function useResourceTabs({
  skillId,
  skillSlug,
  resources,
}: {
  skillId: string;
  skillSlug: string;
  resources: SkillResourceReference[];
}) {
  const searchParams = useSearchParams();

  /* ── Derive initial state from URL ── */
  const initialResourcePath = searchParams.get("resource");
  const initialResource = useMemo(() => {
    if (!initialResourcePath) return null;
    return resources.find((r) => r.path === initialResourcePath) ?? null;
  }, [initialResourcePath, resources]);

  /* ── Tab state ── */
  const skillTab: SkillTab = useMemo(
    () => ({ kind: "skill", id: skillId, label: `${skillSlug}.md` }),
    [skillId, skillSlug],
  );

  const [openResourceTabs, setOpenResourceTabs] = useState<ResourceTab[]>(() => {
    if (initialResource) {
      return [
        {
          kind: "resource",
          id: initialResource.id,
          path: initialResource.path,
          label: lastSegment(initialResource.path),
        },
      ];
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() =>
    initialResource ? initialResource.id : skillId,
  );

  /* ── Derived values ── */
  const tabs: ContentTab[] = useMemo(
    () => [skillTab, ...openResourceTabs],
    [skillTab, openResourceTabs],
  );

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? skillTab,
    [tabs, activeTabId, skillTab],
  );

  const activeResourcePath = activeTab.kind === "resource" ? activeTab.path : null;

  /** The node id to highlight in the graph */
  const focusNodeId = activeTab.kind === "resource" ? activeTab.id : skillId;

  /* ── URL sync ── */
  useEffect(() => {
    const currentParam = searchParams.get("resource");
    const desiredParam = activeResourcePath;

    if (currentParam === desiredParam) return;

    const params = new URLSearchParams(searchParams.toString());
    if (desiredParam) {
      params.set("resource", desiredParam);
    } else {
      params.delete("resource");
    }

    const newSearch = params.toString();
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;

    // Use window.history to avoid Next.js Route type constraints
    window.history.replaceState(window.history.state, "", newUrl);
  }, [activeResourcePath, searchParams]);

  /* ── Actions ── */
  const openResource = useCallback(
    (resource: SkillResourceReference) => {
      const existing = openResourceTabs.find((t) => t.id === resource.id);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      const newTab: ResourceTab = {
        kind: "resource",
        id: resource.id,
        path: resource.path,
        label: lastSegment(resource.path),
      };

      setOpenResourceTabs((prev) => [...prev, newTab]);
      setActiveTabId(resource.id);
    },
    [openResourceTabs],
  );

  const openResourceByPath = useCallback(
    (path: string) => {
      const resource = resources.find((r) => r.path === path);
      if (resource) {
        openResource(resource);
      }
    },
    [resources, openResource],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setOpenResourceTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        if (idx === -1) return prev;

        const next = prev.filter((t) => t.id !== tabId);

        // If the closed tab was active, switch to the nearest neighbor or skill tab
        if (activeTabId === tabId) {
          if (next.length > 0) {
            const neighborIdx = Math.min(idx, next.length - 1);
            setActiveTabId(next[neighborIdx]!.id);
          } else {
            setActiveTabId(skillId);
          }
        }

        return next;
      });
    },
    [activeTabId, skillId],
  );

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  /* ── Resource metadata helpers ── */
  const getActiveResourceMeta = useCallback(() => {
    if (activeTab.kind !== "resource") return null;
    const resource = resources.find((r) => r.id === activeTab.id);
    if (!resource) return null;

    const canRender = canRenderResourceAsMarkdown(resource.path, resource.kind);
    const downloadName = getResourceDownloadName(resource.path, `${resource.id}.txt`);
    const mimeType = getResourceMimeType(resource.path);

    return { resource, canRender, downloadName, mimeType };
  }, [activeTab, resources]);

  return {
    tabs,
    activeTab,
    activeTabId,
    activeResourcePath,
    focusNodeId,
    openResource,
    openResourceByPath,
    closeTab,
    switchTab,
    getActiveResourceMeta,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function lastSegment(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}
