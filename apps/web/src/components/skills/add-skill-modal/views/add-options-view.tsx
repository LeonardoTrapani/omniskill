"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SelectedSkill } from "@/hooks/skills/use-modal-machine";
import { buildSkillHref } from "@/lib/skills/routes";

interface AddOptionsViewProps {
  skill: SelectedSkill;
  onClose: () => void;
}

export default function AddOptionsView({ skill, onClose }: AddOptionsViewProps) {
  const router = useRouter();

  const handleOpen = () => {
    onClose();
    router.push(buildSkillHref(skill.id));
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Open Skill</AlertDialogTitle>
        <AlertDialogDescription>
          Open &ldquo;{skill.name}&rdquo; in your vault.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Close</AlertDialogCancel>
        <AlertDialogAction onClick={handleOpen}>
          Open in Vault
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
