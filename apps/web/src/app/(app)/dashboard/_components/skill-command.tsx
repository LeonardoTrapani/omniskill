"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import type { SelectedSkill } from "../_hooks/use-modal-machine";

interface SkillCommandProps {
  onSelectSkill: (skill: SelectedSkill) => void;
  onCreateWithAI: (search: string) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SkillCommand({ onSelectSkill, onCreateWithAI }: SkillCommandProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    ...trpc.skills.list.queryOptions({
      limit: 20,
      search: debouncedSearch || undefined,
    }),
    placeholderData: keepPreviousData,
  });

  const skills = data?.items ?? [];

  return (
    <Command shouldFilter={false} className="border border-border">
      <CommandInput placeholder="Search skills..." value={search} onValueChange={setSearch} />
      <CommandList>
        <CommandGroup>
          <CommandItem onSelect={() => onCreateWithAI(search)} className="text-muted-foreground">
            <Sparkles className="size-4" />
            {search.trim() ? (
              <>Create &ldquo;{search.trim()}&rdquo; with AI</>
            ) : (
              "Create a new skill with AI"
            )}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Skills">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && skills.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {debouncedSearch ? "No matching skills" : "No public skills yet"}
            </p>
          )}

          {skills.map((skill) => (
            <CommandItem
              key={skill.id}
              onSelect={() =>
                onSelectSkill({
                  id: skill.id,
                  name: skill.name,
                  slug: skill.slug,
                  description: skill.description,
                })
              }
            >
              {skill.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
