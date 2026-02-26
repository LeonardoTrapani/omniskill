"use client";

import { X } from "lucide-react";

import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import AddOptionsView from "@/components/skills/add-skill-modal/views/add-options-view";
import BrowseSkillsView from "@/components/skills/add-skill-modal/views/browse-skills-view";
import ChoiceView from "@/components/skills/add-skill-modal/views/choice-view";
import {
  useModalMachine,
  type ModalView,
  type SelectedSkill,
} from "@/hooks/skills/use-modal-machine";

interface AddSkillModalProps {
  open: boolean;
  onClose: () => void;
  initialSkill?: SelectedSkill | null;
}

const viewTitles: Record<ModalView, string> = {
  "initial-choice": "Add New Skill",
  "browse-existing": "Browse Skills",
  "add-options": "Add to Vault",
};

export default function AddSkillModal({ open, onClose, initialSkill }: AddSkillModalProps) {
  const { state, dispatch } = useModalMachine({ initialSkill });
  const isConfirmView = state.view === "add-options";

  const handleClose = () => {
    dispatch({ type: "RESET" });
    onClose();
  };

  if (isConfirmView && state.selectedSkill) {
    return (
      <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <AlertDialogContent size="sm">
          <AddOptionsView skill={state.selectedSkill} onClose={handleClose} />
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent size="lg" className="flex max-h-[80vh] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <AlertDialogTitle className="text-lg font-semibold tracking-tight">
            {viewTitles[state.view]}
          </AlertDialogTitle>
          <Button variant="ghost" size="icon-xs" onClick={handleClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pt-3">
          {state.view === "initial-choice" && <ChoiceView dispatch={dispatch} />}
          {state.view === "browse-existing" && <BrowseSkillsView dispatch={dispatch} />}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
