import { create } from 'zustand';

interface HighlightState {
  /**
   * The project just created. Creating opens its backlog (PRJ-2), so its tile plays the
   * `kbAdded` highlight (DESIGN §9 03) the next time the Projects page shows it.
   */
  projectId: string | null;
  /** Todos just created by quick create: their rows play `kbAdded` once (DESIGN §7 row). */
  todoIds: string[];
  markProject: (projectId: string) => void;
  clearProject: (projectId: string) => void;
  markTodo: (todoId: string) => void;
  clearTodo: (todoId: string) => void;
  reset: () => void;
}

const initialState = { projectId: null, todoIds: [] } satisfies Partial<HighlightState>;

export const useHighlight = create<HighlightState>()((set, get) => ({
  ...initialState,
  markProject: (projectId) => {
    set({ projectId });
  },
  clearProject: (projectId) => {
    if (get().projectId === projectId) set({ projectId: null });
  },
  markTodo: (todoId) => {
    set((state) => ({ todoIds: [...state.todoIds, todoId] }));
  },
  clearTodo: (todoId) => {
    set((state) => ({ todoIds: state.todoIds.filter((id) => id !== todoId) }));
  },
  reset: () => {
    set(initialState);
  },
}));
