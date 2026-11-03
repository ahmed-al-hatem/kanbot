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
  /**
   * True right after a deliberate log out, so the guard sends the user to plain `/login`
   * instead of `/login?redirect=<page they were on>` (AUTH-4). Never persisted.
   */
  signedOut: boolean;
  signIn: (token: string) => void;
  /** Called by api/client.ts on a 401. Idempotent, so parallel 401s are harmless. */
  expire: () => void;
  /** Clears the token, every UI store and the query cache. */
  signOut: () => void;
  reset: () => void;
}

const initialState = { token: null, sessionExpired: false, signedOut: false } satisfies Partial<SessionState>;

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initialState,
      signIn: (token) => {
        set({ token, sessionExpired: false, signedOut: false });
      },
      expire: () => {
        if (get().sessionExpired) return;
        set({ token: null, sessionExpired: true });
      },
      signOut: () => {
        set({ ...initialState, signedOut: true });
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

/**
 * Follows log in / log out in other tabs (plan §9.2): the `storage` event fires when another
 * tab writes the token key. A different token means a different session, so the cache goes too.
 * Returns the unsubscribe function.
 */
export function listenForSessionChanges(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEYS.token) return;
    const before = useSession.getState().token;
    const apply = () => {
      const after = useSession.getState().token;
      if (after === before) return;
      queryClient.clear();
      if (!after) useSession.setState({ signedOut: true });
    };
    // A removed key (storage cleared) rehydrates nothing, so drop the token by hand.
    if (event.newValue === null) {
      useSession.setState({ token: null });
      apply();
      return;
    }
    void Promise.resolve(useSession.persist.rehydrate()).then(apply);
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('storage', onStorage);
  };
}
