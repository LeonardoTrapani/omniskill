"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/utils/trpc";
import { queryClient } from "@/utils/trpc";

interface DeleteSkillDialogProps {
  open: boolean;
  onClose: () => void;
  skillId: string | null;
  skillName: string | null;
}

export default function DeleteSkillDialog({
  open,
  onClose,
  skillId,
  skillName,
}: DeleteSkillDialogProps) {
  const deleteMutation = useMutation(
    trpc.skills.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.skills.listByOwner.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.skills.graph.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.skills.graphForSkill.queryKey() });
        toast.success(`"${skillName}" has been deleted`);
        onClose();
      },
      onError: (error) => {
        toast.error(`Failed to delete skill: ${error.message}`);
      },
    }),
  );

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete skill</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &ldquo;{skillName}&rdquo;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (skillId) {
                deleteMutation.mutate({ id: skillId });
              }
            }}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
