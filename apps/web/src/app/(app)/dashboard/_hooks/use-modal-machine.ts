import { useReducer } from "react";

export type ModalView =
  | "initial-choice"
  | "browse-existing"
  | "add-options"
  | "chat-customize"
  | "chat-create"
  | "success";

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
  | { type: "ADD_RAW" }
  | { type: "CUSTOMIZE_SKILL" }
  | { type: "SKILL_CREATED" }
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
    case "ADD_RAW":
      // Handled externally — the parent triggers the mutation then dispatches SKILL_CREATED
      return state;
    case "CUSTOMIZE_SKILL":
      return {
        ...state,
        view: "chat-customize",
        history: [...state.history, state.view],
      };
    case "SKILL_CREATED":
      return {
        ...state,
        view: "success",
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

export function useModalMachine() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state, dispatch };
}
