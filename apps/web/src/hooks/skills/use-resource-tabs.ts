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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const initialReferencesParam = searchParams.get("references");
  const initialActiveTabParam = searchParams.get("activeTab");
  const initialLegacyResourcePath = searchParams.get("resource");

  const resourcesById = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );

  const initialResourceTabs = useMemo(
    () => buildResourceTabsFromReferences(initialReferencesParam, resourcesById),
    [initialReferencesParam, resourcesById],
  );

  const initialLegacyResource = useMemo(() => {
    if (!initialLegacyResourcePath) return null;
    return resources.find((r) => r.path === initialLegacyResourcePath) ?? null;
  }, [initialLegacyResourcePath, resources]);

  /* ── Tab state ── */
  const skillTab: SkillTab = useMemo(
    () => ({ kind: "skill", id: skillId, label: `${skillSlug}.md` }),
    [skillId, skillSlug],
  );

  const [openResourceTabs, setOpenResourceTabs] = useState<ResourceTab[]>(() => {
    if (initialResourceTabs.length > 0) {
      return initialResourceTabs;
    }

    if (initialLegacyResource) {
      return [toResourceTab(initialLegacyResource)];
    }

    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (initialResourceTabs.length > 0) {
      return resolveActiveTabId(initialActiveTabParam, initialResourceTabs, skillId);
    }

    if (initialLegacyResource) {
      return initialLegacyResource.id;
    }

    return skillId;
  });

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

  /* ── URL -> state sync (for cmd+k and browser navigation) ── */
  useEffect(() => {
    const referencesParam = searchParams.get("references");
    const activeTabParam = searchParams.get("activeTab");
    const legacyResourcePath = searchParams.get("resource");

    const tabsFromReferences = buildResourceTabsFromReferences(referencesParam, resourcesById);

    let nextTabs = tabsFromReferences;
    if (nextTabs.length === 0 && legacyResourcePath) {
      const legacyResource = resources.find((r) => r.path === legacyResourcePath);
      nextTabs = legacyResource ? [toResourceTab(legacyResource)] : [];
    }

    const nextActiveTabId = resolveActiveTabId(activeTabParam, nextTabs, skillId);

    setOpenResourceTabs((prev) => (areTabsEqual(prev, nextTabs) ? prev : nextTabs));
    setActiveTabId((prev) => (prev === nextActiveTabId ? prev : nextActiveTabId));
  }, [searchParams, resourcesById, resources, skillId]);

  /* ── URL sync ── */
  useEffect(() => {
    const currentReferencesParam = searchParams.get("references") ?? "";
    const currentActiveTabParam = searchParams.get("activeTab") ?? "";
    const currentLegacyResourceParam = searchParams.get("resource");

    const desiredReferencesParam = openResourceTabs.map((tab) => tab.id).join(",");
    const desiredActiveTabParam = activeTab.kind === "skill" ? "skill" : activeTab.id;

    if (
      currentReferencesParam === desiredReferencesParam &&
      (desiredReferencesParam.length === 0 || currentActiveTabParam === desiredActiveTabParam) &&
      currentLegacyResourceParam === null
    ) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (desiredReferencesParam.length > 0) {
      params.set("references", desiredReferencesParam);
      params.set("activeTab", desiredActiveTabParam);
    } else {
      params.delete("references");
      params.delete("activeTab");
    }

    // Remove legacy URL shape once state is synced.
    params.delete("resource");

    const newSearch = params.toString();
    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;

    // Use window.history to avoid Next.js Route type constraints
    window.history.replaceState(window.history.state, "", newUrl);
  }, [activeTab, openResourceTabs, searchParams]);

  /* ── Actions ── */
  const openResource = useCallback((resource: SkillResourceReference) => {
    setOpenResourceTabs((prev) => {
      if (prev.some((tab) => tab.id === resource.id)) {
        return prev;
      }

      const newTab: ResourceTab = {
        kind: "resource",
        id: resource.id,
        path: resource.path,
        label: lastSegment(resource.path),
      };

      return [...prev, newTab];
    });
    setActiveTabId(resource.id);
  }, []);

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

function toResourceTab(resource: SkillResourceReference): ResourceTab {
  return {
    kind: "resource",
    id: resource.id,
    path: resource.path,
    label: lastSegment(resource.path),
  };
}

function buildResourceTabsFromReferences(
  referencesParam: string | null,
  resourcesById: Map<string, SkillResourceReference>,
): ResourceTab[] {
  if (!referencesParam) return [];

  const ids = referencesParam
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id, idx, arr) => id.length > 0 && arr.indexOf(id) === idx && UUID_RE.test(id));

  const tabs: ResourceTab[] = [];
  for (const id of ids) {
    const resource = resourcesById.get(id);
    if (!resource) continue;
    tabs.push(toResourceTab(resource));
  }

  return tabs;
}

function resolveActiveTabId(
  activeTabParam: string | null,
  tabs: ResourceTab[],
  skillId: string,
): string {
  const normalizedActiveTabParam = activeTabParam?.trim().toLowerCase() ?? null;

  if (tabs.length === 0) return skillId;
  if (normalizedActiveTabParam === "skill") return skillId;

  if (normalizedActiveTabParam && tabs.some((tab) => tab.id === normalizedActiveTabParam)) {
    return normalizedActiveTabParam;
  }

  return tabs[0]!.id;
}

function areTabsEqual(a: ResourceTab[], b: ResourceTab[]) {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i += 1) {
    if (a[i]!.id !== b[i]!.id || a[i]!.path !== b[i]!.path) {
      return false;
    }
  }

  return true;
}
