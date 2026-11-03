import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { queryClient } from '@/app/queryClient';
import { safeStorage, STORAGE_KEYS } from '@/lib/storage';
import { useAnnouncer } from './announcer';
import { useToast } from './toast';

interface SessionState {
  /** The JWT — the only thing the client persists about the user (NFR-7). */
  token: string | null;
  /** Set when an authenticated request returns 401; drives the session-expired dialog (AUTH-6). */
  sessionExpired: boolean;
  signIn: (token: string) => void;
  /** Called by api/client.ts on a 401. Idempotent, so parallel 401s are harmless. */
  expire: () => void;
  /** Clears the token, every UI store and the query cache. */
  signOut: () => void;
  reset: () => void;
}

const initialState = { token: null, sessionExpired: false } satisfies Partial<SessionState>;

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initialState,
      signIn: (token) => {
        set({ token, sessionExpired: false });
      },
      expire: () => {
        if (get().sessionExpired) return;
        set({ token: null, sessionExpired: true });
      },
      signOut: () => {
        set(initialState);
        useToast.getState().reset();
        useAnnouncer.getState().reset();
        queryClient.clear();
      },
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: STORAGE_KEYS.token,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
