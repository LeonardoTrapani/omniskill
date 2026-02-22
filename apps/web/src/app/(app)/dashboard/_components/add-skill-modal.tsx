"use client";

import { ArrowLeft, X } from "lucide-react";

import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useModalMachine } from "../_hooks/use-modal-machine";
import type { ModalView, SelectedSkill } from "../_hooks/use-modal-machine";

import ChoiceView from "./modal-views/choice-view";
import BrowseSkillsView from "./modal-views/browse-skills-view";
import AddOptionsView from "./modal-views/add-options-view";
import ChatView from "./modal-views/chat-view";

interface AddSkillModalProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  initialSkill?: SelectedSkill | null;
  initialView?: ModalView;
  initialPrompt?: string;
}

const viewTitles: Record<ModalView, string> = {
  "initial-choice": "Add New Skill",
  "browse-existing": "Browse Skills",
  "add-options": "Add Skill",
  "chat-create": "Create New Skill",
};

function buildCustomizeStartPrompt(skill: SelectedSkill) {
  return `I found skill "${skill.name}" (${skill.slug}) and I would like to integrate it into ...`;
}

export default function AddSkillModal({
  open,
  onClose,
  onBack,
  initialSkill,
  initialView,
  initialPrompt,
}: AddSkillModalProps) {
  const { state, dispatch } = useModalMachine({ initialSkill, initialView });

  const handleClose = () => {
    dispatch({ type: "RESET" });
    onClose();
  };

  const handleBack = () => {
    if (state.history.length > 0) {
      dispatch({ type: "GO_BACK" });
    } else if (onBack) {
      dispatch({ type: "RESET" });
      onBack();
    } else {
      handleClose();
    }
  };

  const canGoBack = state.view !== "initial-choice";

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent size="lg" className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button variant="ghost" size="icon-xs" onClick={handleBack} aria-label="Go back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <AlertDialogTitle className="text-sm font-semibold">
              {viewTitles[state.view]}
            </AlertDialogTitle>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={handleClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {state.view === "initial-choice" && <ChoiceView dispatch={dispatch} />}
          {state.view === "browse-existing" && <BrowseSkillsView dispatch={dispatch} />}
          {state.view === "add-options" && state.selectedSkill && (
            <AddOptionsView skill={state.selectedSkill} dispatch={dispatch} onClose={handleClose} />
          )}
          {state.view === "chat-create" && (
            <ChatView
              selectedSkill={state.selectedSkill}
              initialInput={
                state.selectedSkill
                  ? buildCustomizeStartPrompt(state.selectedSkill)
                  : (initialPrompt ?? undefined)
              }
            />
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
