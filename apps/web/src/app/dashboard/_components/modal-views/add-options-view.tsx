"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

import { AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { trpc, queryClient } from "@/utils/trpc";
import type { SelectedSkill } from "../../_hooks/use-modal-machine";

interface AddOptionsViewProps {
  skill: SelectedSkill;
  onClose: () => void;
}

export default function AddOptionsView({ skill, onClose }: AddOptionsViewProps) {
  const duplicateMutation = useMutation(
    trpc.skills.duplicate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.skills.listByOwner.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.skills.graph.queryKey(),
        });
        toast.success(`"${skill.name}" added to your vault`);
        onClose();
      },
      onError: (error) => {
        toast.error(`Failed to add skill: ${error.message}`);
      },
    }),
  );

  const resourceCount = skill.resourceCount ?? 0;

  return (
    <div className="py-2">
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">Confirm adding this skill to your vault:</p>
        <p className="text-xl font-semibold text-foreground">{skill.name}</p>
        {resourceCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {resourceCount} linked resource{resourceCount !== 1 ? "s" : ""} will be imported
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <AlertDialogCancel onClick={onClose} disabled={duplicateMutation.isPending}>
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={duplicateMutation.isPending}
          onClick={() => duplicateMutation.mutate({ id: skill.id })}
        >
          {duplicateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add to Vault"
          )}
        </AlertDialogAction>
      </div>
    </div>
  );
}
