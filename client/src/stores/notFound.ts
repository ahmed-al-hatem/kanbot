import { useEffect } from 'react';
import { create } from 'zustand';

/** Why the 404 page is showing (DESIGN §9 Global — 404, "Variants by cause"). */
export type NotFoundCause = 'route' | 'project' | 'sprint' | 'todo';

interface NotFoundState {
  /** Set while the 404 page is on screen, so the shell shows no nav item as current. */
  cause: NotFoundCause | null;
  set: (cause: NotFoundCause | null) => void;
}

/** UI state only: nothing here comes from the server. */
export const useNotFound = create<NotFoundState>()((set) => ({
  cause: null,
  set: (cause) => {
    set({ cause });
  },
}));

/** Marks the page as "not found" while the calling component is mounted. */
export function useMarkNotFound(cause: NotFoundCause) {
  useEffect(() => {
    useNotFound.getState().set(cause);
    return () => {
      useNotFound.getState().set(null);
    };
  }, [cause]);
}
