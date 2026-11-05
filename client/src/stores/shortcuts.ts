import { create } from 'zustand';

interface ShortcutsState {
  /** The "Keyboard shortcuts" help dialog (`?`, or the profile menu). */
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  reset: () => void;
}

export const useShortcuts = create<ShortcutsState>()((set) => ({
  helpOpen: false,
  setHelpOpen: (helpOpen) => {
    set({ helpOpen });
  },
  reset: () => {
    set({ helpOpen: false });
  },
}));
