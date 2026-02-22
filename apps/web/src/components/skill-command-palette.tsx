"use client";

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { Search, Copy, ArrowUp, Loader2, Plus } from "lucide-react";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddSkillModal from "@/app/(app)/dashboard/_components/add-skill-modal";
import type { ModalView, SelectedSkill } from "@/app/(app)/dashboard/_hooks/use-modal-machine";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type ModalTarget = { type: "skill"; skill: SelectedSkill } | { type: "create" } | null;

/** Trigger button — render in as many places as needed, all point to the same palette */
export function SkillCommandTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-2 text-muted-foreground"
      onClick={onOpen}
    >
      <Search className="size-3.5" />
      <span className="hidden sm:inline text-xs">Search...</span>
      <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-[11px]">⌘</span>K
      </kbd>
    </Button>
  );
}

/** Dialog + keyboard listener + modal — render once */
export function SkillCommandPalette({
  open,
  onOpenChange,
  initialSearch,
  skillCount = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSearch?: string;
  skillCount?: number;
}) {
  const [search, setSearch] = useState(initialSearch ?? "");
  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [modalKey, setModalKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // sync initialSearch when it changes (e.g. from ?q= param)
  useEffect(() => {
    if (initialSearch) setSearch(initialSearch);
  }, [initialSearch]);

  const debouncedSearch = useDebounce(search, 300);
  const hasQuery = debouncedSearch.trim().length > 0;

  const { data, isLoading } = useQuery({
    ...trpc.skills.search.queryOptions({
      query: debouncedSearch.trim(),
      scope: "all",
      limit: 3,
    }),
    placeholderData: keepPreviousData,
    enabled: open && hasQuery,
  });

  const suggestions = data?.items ?? [];

  // focus input when dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) setSearch("");
    },
    [onOpenChange],
  );

  const openModal = useCallback(
    (target: ModalTarget) => {
      onOpenChange(false);
      setSearch("");
      setModalTarget(target);
      setModalKey((k) => k + 1);
    },
    [onOpenChange],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    openModal({ type: "create" });
  };

  const initialSkill = modalTarget?.type === "skill" ? modalTarget.skill : undefined;
  const initialView: ModalView | undefined =
    modalTarget?.type === "create" ? "chat-create" : undefined;

  const showSuggestions = hasQuery && (isLoading || suggestions.length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogHeader className="sr-only">
          <DialogTitle>Search skills</DialogTitle>
          <DialogDescription>Search for skills or create a new one with AI</DialogDescription>
        </DialogHeader>
        <DialogContent
          className="p-0 top-[30%] translate-y-0 sm:max-w-2xl gap-0 overflow-hidden"
          showCloseButton={false}
        >
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="I want my agent to know how to use..."
              className="w-full bg-transparent px-1 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none"
              aria-label="Describe the skill you need"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Copy className="w-3 h-3" />
                {skillCount > 0 && <span>{skillCount} skills in the registry</span>}
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
              >
                Submit
                <ArrowUp className="w-2.5 h-2.5" />
              </button>
            </div>
          </form>

          {showSuggestions && (
            <div className="border-t border-border">
              {isLoading && suggestions.length === 0 && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {suggestions.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() =>
                    openModal({
                      type: "skill",
                      skill: {
                        id: skill.id,
                        name: skill.name,
                        slug: skill.slug,
                        description: skill.description,
                      },
                    })
                  }
                  className="flex items-center gap-3 w-full px-6 py-2.5 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Plus className="size-3.5 flex-shrink-0 opacity-50" />
                  {skill.name}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddSkillModal
        key={modalKey}
        open={modalTarget !== null}
        onClose={() => setModalTarget(null)}
        onBack={() => {
          setModalTarget(null);
          onOpenChange(true);
        }}
        initialSkill={initialSkill}
        initialView={initialView}
      />
    </>
  );
}
