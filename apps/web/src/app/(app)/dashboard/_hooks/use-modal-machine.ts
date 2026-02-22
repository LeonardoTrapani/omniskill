import { useReducer } from "react";

export type ModalView = "initial-choice" | "browse-existing" | "add-options" | "chat-create";

export interface SelectedSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ModalState {
  view: ModalView;
  selectedSkill: SelectedSkill | null;
  history: ModalView[];
}

type ModalAction =
  | { type: "CHOOSE_EXISTING" }
  | { type: "CHOOSE_CREATE_NEW" }
  | { type: "SELECT_SKILL"; skill: SelectedSkill }
  | { type: "CUSTOMIZE_SKILL" }
  | { type: "GO_BACK" }
  | { type: "RESET" };

const initialState: ModalState = {
  view: "initial-choice",
  selectedSkill: null,
  history: [],
};

function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "CHOOSE_EXISTING":
      return {
        ...state,
        view: "browse-existing",
        history: [...state.history, state.view],
      };
    case "CHOOSE_CREATE_NEW":
      return {
        ...state,
        view: "chat-create",
        history: [...state.history, state.view],
      };
    case "SELECT_SKILL":
      return {
        ...state,
        view: "add-options",
        selectedSkill: action.skill,
        history: [...state.history, state.view],
      };
    case "CUSTOMIZE_SKILL":
      return {
        ...state,
        view: "chat-create",
        history: [...state.history, state.view],
      };
    case "GO_BACK": {
      const history = [...state.history];
      const previousView = history.pop();
      if (!previousView) return state;
      return {
        ...state,
        view: previousView,
        history,
        selectedSkill: previousView === "initial-choice" ? null : state.selectedSkill,
      };
    }
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface ModalMachineOptions {
  initialSkill?: SelectedSkill | null;
  initialView?: ModalView;
}

export function useModalMachine(options?: ModalMachineOptions) {
  const init: ModalState = options?.initialSkill
    ? { view: "add-options", selectedSkill: options.initialSkill, history: [] }
    : options?.initialView
      ? { view: options.initialView, selectedSkill: null, history: [] }
      : initialState;

  const [state, dispatch] = useReducer(reducer, init);
  return { state, dispatch };
}
