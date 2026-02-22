"use client";

import { type Dispatch } from "react";
import { Copy, Sparkles, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { trpc, queryClient } from "@/utils/trpc";
import type { SelectedSkill } from "../../_hooks/use-modal-machine";

type ModalAction = { type: "CUSTOMIZE_SKILL" };

interface AddOptionsViewProps {
  skill: SelectedSkill;
  dispatch: Dispatch<ModalAction>;
  onClose: () => void;
}

export default function AddOptionsView({ skill, dispatch, onClose }: AddOptionsViewProps) {
  const duplicateMutation = useMutation(
    trpc.skills.duplicate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.skills.listByOwner.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.skills.graph.queryKey(),
        });
        toast.success(`"${skill.name}" added to your collection`);
        onClose();
      },
      onError: (error) => {
        toast.error(`Failed to add skill: ${error.message}`);
      },
    }),
  );

  return (
    <div className="py-4">
      <div className="border border-border p-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground">{skill.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => duplicateMutation.mutate({ id: skill.id })}
          disabled={duplicateMutation.isPending}
          className="border border-border p-6 text-left hover:border-primary/50 hover:bg-secondary/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {duplicateMutation.isPending ? (
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-3" />
          ) : (
            <Copy className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
          )}
          <h3 className="text-sm font-semibold text-foreground mb-1">Add Raw</h3>
          <p className="text-xs text-muted-foreground">Add this skill as-is to your collection</p>
        </button>

        <button
          onClick={() => dispatch({ type: "CUSTOMIZE_SKILL" })}
          className="border border-border p-6 text-left hover:border-primary/50 hover:bg-secondary/50 transition-all group"
        >
          <Edit className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Customize Skill</h3>
          <p className="text-xs text-muted-foreground">
            Modify this skill with AI assistance before adding
          </p>
        </button>
      </div>
    </div>
  );
}
