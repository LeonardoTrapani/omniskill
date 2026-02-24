"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

type SkillSearchScope = "own" | "all";
type SkillSearchVisibility = "public" | "private";

interface UseSkillSearchOptions {
  query: string;
  enabled?: boolean;
  scope?: SkillSearchScope;
  visibility?: SkillSearchVisibility;
  initialLimit?: number;
  limitStep?: number;
  maxLimit?: number;
  debounceMs?: number;
}

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useSkillSearch({
  query,
  enabled = true,
  scope = "all",
  visibility = "public",
  initialLimit = 5,
  limitStep = 5,
  maxLimit = 50,
  debounceMs = 300,
}: UseSkillSearchOptions) {
  const normalizedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(normalizedQuery, debounceMs);
  const [limit, setLimit] = useState(initialLimit);

  useEffect(() => {
    setLimit(initialLimit);
  }, [debouncedQuery, initialLimit]);

  const hasQuery = debouncedQuery.length > 0;
  const shouldRunQuery = enabled && hasQuery;

  const queryResult = useQuery({
    ...trpc.skills.search.queryOptions({
      query: debouncedQuery,
      scope,
      limit,
      visibility,
    }),
    placeholderData: keepPreviousData,
    enabled: shouldRunQuery,
  });

  const items = queryResult.data?.items ?? [];
  const total = queryResult.data?.total ?? 0;
  const canLoadMore = shouldRunQuery && items.length < total && limit < maxLimit;

  const loadMore = () => {
    setLimit((previous) => Math.min(previous + limitStep, maxLimit));
  };

  return {
    ...queryResult,
    items,
    total,
    hasQuery,
    debouncedQuery,
    limit,
    canLoadMore,
    loadMore,
  };
}
