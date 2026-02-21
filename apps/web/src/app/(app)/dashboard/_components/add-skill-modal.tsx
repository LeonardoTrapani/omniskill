"use client";

import { ArrowLeft, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useModalMachine } from "../_hooks/use-modal-machine";
import type { ModalView } from "../_hooks/use-modal-machine";

import ChoiceView from "./modal-views/choice-view";
import BrowseSkillsView from "./modal-views/browse-skills-view";
import AddOptionsView from "./modal-views/add-options-view";
import ChatView from "./modal-views/chat-view";

interface AddSkillModalProps {
  open: boolean;
  onClose: () => void;
}

const viewTitles: Record<ModalView, string> = {
  "initial-choice": "Add New Skill",
  "browse-existing": "Browse Skills",
  "add-options": "Add Skill",
  "chat-customize": "Customize Skill",
  "chat-create": "Create New Skill",
  success: "Success",
};

export default function AddSkillModal({ open, onClose }: AddSkillModalProps) {
  const { state, dispatch } = useModalMachine();

  const handleClose = () => {
    dispatch({ type: "RESET" });
    onClose();
  };

  const canGoBack = state.view !== "initial-choice" && state.view !== "success";

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <AlertDialogContent size="lg" className="flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => dispatch({ type: "GO_BACK" })}
                aria-label="Go back"
              >
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
            <AddOptionsView skill={state.selectedSkill} dispatch={dispatch} />
          )}
          {(state.view === "chat-customize" || state.view === "chat-create") && (
            <ChatView
              mode={state.view === "chat-customize" ? "customize" : "create"}
              selectedSkill={state.selectedSkill}
            />
          )}
          {state.view === "success" && (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-foreground">Skill added successfully!</p>
              <p className="text-xs text-muted-foreground mt-2">
                You can find it in your My Omni collection.
              </p>
              <Button className="mt-4" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
