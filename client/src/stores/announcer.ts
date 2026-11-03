import { create } from 'zustand';

export type Politeness = 'polite' | 'assertive';

interface AnnouncerState {
  message: string;
  politeness: Politeness;
  /** Changes on every call, so the LiveRegion re-announces an identical message. */
  id: number;
  /** Screen-reader announcement, e.g. "KAN-21 moved to In Progress, position 2 of 5" (DESIGN §10.4). */
  announce: (message: string, politeness?: Politeness) => void;
  reset: () => void;
}

const initialState = { message: '', politeness: 'polite', id: 0 } satisfies Partial<AnnouncerState>;

export const useAnnouncer = create<AnnouncerState>()((set) => ({
  ...initialState,
  announce: (message, politeness = 'polite') => {
    set((state) => ({ message, politeness, id: state.id + 1 }));
  },
  reset: () => {
    set(initialState);
  },
}));

/** Usable outside React, e.g. from drag-and-drop handlers. */
export const announce = (message: string, politeness?: Politeness) => {
  useAnnouncer.getState().announce(message, politeness);
};
