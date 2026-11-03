import { create } from 'zustand';

interface AssistantState {
  /** The AI drawer (DESIGN §7). Its chat, keyed by project, joins in phase 7. */
  open: boolean;
  setOpen: (open: boolean) => void;
  reset: () => void;
}

export const useAssistant = create<AssistantState>()((set) => ({
  open: false,
  setOpen: (open) => {
    set({ open });
  },
  reset: () => {
    set({ open: false });
  },
}));

export const openAssistant = () => {
  useAssistant.getState().setOpen(true);
};
