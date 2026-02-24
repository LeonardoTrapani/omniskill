"use client";

import { Search } from "lucide-react";
import type { Dispatch } from "react";

type ModalAction = { type: "CHOOSE_EXISTING" };

interface ChoiceViewProps {
  dispatch: Dispatch<ModalAction>;
}

export default function ChoiceView({ dispatch }: ChoiceViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 py-4">
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
    </div>
  );
}
