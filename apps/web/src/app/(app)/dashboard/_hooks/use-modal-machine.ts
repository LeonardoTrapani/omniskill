import { useReducer } from "react";

export type ModalView =
  | "initial-choice"
  | "browse-existing"
  | "add-options"
  | "chat-customize"
  | "chat-create";

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
        view: "chat-customize",
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

export function useModalMachine(initialSkill?: SelectedSkill | null) {
  const [state, dispatch] = useReducer(
    reducer,
    initialSkill
      ? { view: "add-options" as const, selectedSkill: initialSkill, history: [] }
      : initialState,
  );
  return { state, dispatch };
}
