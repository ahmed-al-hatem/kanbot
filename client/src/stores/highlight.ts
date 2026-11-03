import { create } from 'zustand';

interface HighlightState {
  /**
   * The project just created. Creating opens its backlog (PRJ-2), so its tile plays the
   * `kbAdded` highlight (DESIGN §9 03) the next time the Projects page shows it.
   */
  projectId: string | null;
  markProject: (projectId: string) => void;
  clearProject: (projectId: string) => void;
  reset: () => void;
}

export const useHighlight = create<HighlightState>()((set, get) => ({
  projectId: null,
  markProject: (projectId) => {
    set({ projectId });
  },
  clearProject: (projectId) => {
    if (get().projectId === projectId) set({ projectId: null });
  },
  reset: () => {
    set({ projectId: null });
  },
}));
