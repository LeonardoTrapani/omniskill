"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SelectedSkill } from "@/hooks/skills/use-modal-machine";
import { invalidateSkillCollectionQueries } from "@/lib/skills/invalidate-skill-queries";
import { buildSkillHref, dashboardRoute } from "@/lib/skills/routes";
import { trpc } from "@/lib/api/trpc";

interface AddOptionsViewProps {
  skill: SelectedSkill;
  onClose: () => void;
}

export default function AddOptionsView({ skill, onClose }: AddOptionsViewProps) {
  const router = useRouter();

  const ownerSkillsQuery = useQuery(
    trpc.skills.listByOwner.queryOptions({
      search: skill.slug,
      limit: 100,
    }),
  );

  const existingVaultSkill = ownerSkillsQuery.data?.items.find((ownedSkill) => {
    const importedFrom = ownedSkill.metadata.importedFrom;
    if (
      importedFrom &&
      typeof importedFrom === "object" &&
      "skillId" in importedFrom &&
      importedFrom.skillId === skill.id
    ) {
      return true;
    }

    return ownedSkill.slug === skill.slug;
  });

  const alreadyInVault = Boolean(existingVaultSkill);

  const duplicateMutation = useMutation(
    trpc.skills.duplicate.mutationOptions({
      onSuccess: async () => {
        await invalidateSkillCollectionQueries();
        toast.success(`"${skill.name}" added to your vault`);
        onClose();
        router.push(dashboardRoute);
      },
      onError: (error) => {
        toast.error(`Failed to add skill: ${error.message}`);
      },
    }),
  );

  if (alreadyInVault) {
    return (
      <>
        <AlertDialogHeader className="sr-only">
          <AlertDialogTitle>Already in Vault</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Check className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-center text-sm font-medium leading-tight text-foreground">
              Already in your vault
            </p>
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              You added <span className="font-medium text-foreground">{skill.name}</span> to your
              vault. You can open your personal copy to view or edit it.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="pt-2">
          <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!existingVaultSkill) {
                return;
              }
              onClose();
              router.push(buildSkillHref(existingVaultSkill.id));
            }}
          >
            Open in Vault
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </>
    );
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Add to Vault</AlertDialogTitle>
        <AlertDialogDescription>
          Add &ldquo;{skill.name}&rdquo; to your vault? This will create a personal copy you can
          edit.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose} disabled={duplicateMutation.isPending}>
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          disabled={duplicateMutation.isPending || ownerSkillsQuery.isLoading}
          onClick={() => duplicateMutation.mutate({ id: skill.id })}
        >
          {duplicateMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Adding...
            </>
          ) : ownerSkillsQuery.isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Add to Vault"
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
