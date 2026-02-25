"use client";

import { X } from "lucide-react";

import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useModalMachine } from "../_hooks/use-modal-machine";
import type { ModalView, SelectedSkill } from "../_hooks/use-modal-machine";

import ChoiceView from "./modal-views/choice-view";
import BrowseSkillsView from "./modal-views/browse-skills-view";
import AddOptionsView from "./modal-views/add-options-view";

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

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent
        size={isConfirmView ? "lg" : "lg"}
        className={
          isConfirmView ? "max-w-md overflow-hidden" : "flex max-h-[80vh] flex-col overflow-hidden"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 pb-4">
          <AlertDialogTitle className="text-lg font-semibold tracking-tight">
            {viewTitles[state.view]}
          </AlertDialogTitle>
          <Button variant="ghost" size="icon-xs" onClick={handleClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className={isConfirmView ? "pt-2" : "flex-1 min-h-0 overflow-y-auto pt-3"}>
          {state.view === "initial-choice" && <ChoiceView dispatch={dispatch} />}
          {state.view === "browse-existing" && <BrowseSkillsView dispatch={dispatch} />}
          {state.view === "add-options" && state.selectedSkill && (
            <AddOptionsView skill={state.selectedSkill} onClose={handleClose} />
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
