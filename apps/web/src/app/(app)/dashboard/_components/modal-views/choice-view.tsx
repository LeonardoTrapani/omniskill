"use client";

import { Search, Sparkles } from "lucide-react";
import type { Dispatch } from "react";

import type { ModalView } from "../../_hooks/use-modal-machine";

type ModalAction = { type: "CHOOSE_EXISTING" } | { type: "CHOOSE_CREATE_NEW" };

interface ChoiceViewProps {
  dispatch: Dispatch<ModalAction>;
}

export default function ChoiceView({ dispatch }: ChoiceViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
      <button
        onClick={() => dispatch({ type: "CHOOSE_EXISTING" })}
        className="border border-border p-6 text-left hover:border-primary/50 hover:bg-secondary/50 transition-all group"
      >
        <Search className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Add From Existing</h3>
        <p className="text-xs text-muted-foreground">
          Browse and add skills from the public marketplace
        </p>
      </button>

      <button
        onClick={() => dispatch({ type: "CHOOSE_CREATE_NEW" })}
        className="border border-border p-6 text-left hover:border-primary/50 hover:bg-secondary/50 transition-all group"
      >
        <Sparkles className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">Create a New Skill</h3>
        <p className="text-xs text-muted-foreground">
          Describe what you need and create a custom skill with AI
        </p>
      </button>
    </div>
  );
}
