"use client";

import type { Dispatch } from "react";
import { Search } from "lucide-react";

type ModalAction = { type: "CHOOSE_EXISTING" };

interface ChoiceViewProps {
  dispatch: Dispatch<ModalAction>;
}

export default function ChoiceView({ dispatch }: ChoiceViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 py-4">
      <button
        type="button"
        onClick={() => dispatch({ type: "CHOOSE_EXISTING" })}
        className="group border border-border p-6 text-left transition-all hover:border-primary/50 hover:bg-secondary/50"
      >
        <Search className="mb-3 h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
        <h3 className="mb-1 text-sm font-semibold text-foreground">Add From Existing</h3>
        <p className="text-xs text-muted-foreground">
          Browse and add skills from the public marketplace
        </p>
      </button>
    </div>
  );
}
