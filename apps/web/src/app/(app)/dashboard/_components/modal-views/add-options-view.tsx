"use client";

import { useState, type Dispatch } from "react";
import { Copy, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { SelectedSkill } from "../../_hooks/use-modal-machine";

type ModalAction =
  | { type: "CUSTOMIZE_SKILL" }
  | { type: "SKILL_CREATED" };

interface AddOptionsViewProps {
  skill: SelectedSkill;
  dispatch: Dispatch<ModalAction>;
}

export default function AddOptionsView({ skill, dispatch }: AddOptionsViewProps) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAddRaw = async () => {
    setIsAdding(true);

    // TODO: Connect backend — fetch full skill via trpc.skills.getById({ id: skill.id })
    // then create a copy via trpc.skills.create({ ...fullSkill, slug: `${slug}-copy-${Date.now()}`, visibility: "private" })
    // On success: invalidate trpc.skills.listByOwner queries, then dispatch({ type: "SKILL_CREATED" })

    // Simulated delay to show the loading UX
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success(`"${skill.name}" added to your collection`);
    dispatch({ type: "SKILL_CREATED" });
    setIsAdding(false);
  };

  return (
    <div className="py-4">
      <div className="border border-border p-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground">{skill.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={handleAddRaw}
          disabled={isAdding}
          className="border border-border p-6 text-left hover:border-primary/50 hover:bg-secondary/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-3" />
          ) : (
            <Copy className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
          )}
          <h3 className="text-sm font-semibold text-foreground mb-1">Add Raw</h3>
          <p className="text-xs text-muted-foreground">
            Add this skill as-is to your collection
          </p>
        </button>

        <button
          onClick={() => dispatch({ type: "CUSTOMIZE_SKILL" })}
          className="border border-border p-6 text-left hover:border-primary/50 hover:bg-secondary/50 transition-all group"
        >
          <Sparkles className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Customize Skill</h3>
          <p className="text-xs text-muted-foreground">
            Modify this skill with AI assistance before adding
          </p>
        </button>
      </div>
    </div>
  );
}
