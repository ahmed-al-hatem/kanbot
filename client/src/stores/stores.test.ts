import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { STORAGE_KEYS } from '@/lib/storage';
import { useAnnouncer } from './announcer';
import { listenForSessionChanges, useSession } from './session';
import { followSystemTheme, useTheme } from './theme';
import { toast, useToast } from './toast';

describe('session store', () => {
  it('persists only the token', () => {
    useSession.getState().signIn('abc');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.token) ?? '{}') as {
      state: Record<string, unknown>;
    };
    expect(saved.state).toEqual({ token: 'abc' });
  });

  it('expire() clears the token and flags the session as expired', () => {
    useSession.getState().signIn('abc');
    useSession.getState().expire();
    expect(useSession.getState()).toMatchObject({ token: null, sessionExpired: true });
  });

  it('signOut() clears the token, the UI stores and the query cache', () => {
    useSession.getState().signIn('abc');
    toast.success('Saved');
    useAnnouncer.getState().announce('Moved');
    queryClient.setQueryData(['projects'], []);

    useSession.getState().signOut();

    expect(useSession.getState()).toMatchObject({ token: null, sessionExpired: false });
    expect(useToast.getState().toast).toBeNull();
    expect(useAnnouncer.getState().message).toBe('');
    expect(queryClient.getQueryData(['projects'])).toBeUndefined();
  });

  it('signOut() marks a deliberate log out until the next sign in', () => {
    useSession.getState().signOut();
    expect(useSession.getState().signedOut).toBe(true);
    useSession.getState().signIn('abc');
    expect(useSession.getState()).toMatchObject({
      token: 'abc',
      signedOut: false,
      sessionExpired: false,
    });
  });

  it('follows a log out in another tab', async () => {
    useSession.getState().signIn('abc');
    queryClient.setQueryData(['projects'], []);
    const stop = listenForSessionChanges();

    // What the other tab's signOut() writes; the storage event only fires in other tabs.
    const newValue = JSON.stringify({ state: { token: null }, version: 0 });
    window.localStorage.setItem(STORAGE_KEYS.token, newValue);
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEYS.token, newValue }));

    await vi.waitFor(() => {
      expect(useSession.getState()).toMatchObject({ token: null, signedOut: true });
    });
    expect(queryClient.getQueryData(['projects'])).toBeUndefined();
    stop();
  });
});

describe('toast store', () => {
  it('shows one toast at a time; a new one replaces the current one', () => {
    toast.success('First');
    const id = toast.error('Second');
    expect(useToast.getState().toast).toMatchObject({ id, kind: 'error', message: 'Second' });
  });

  it('dismiss(id) ignores a toast that was already replaced', () => {
    const first = toast.info('First');
    toast.info('Second');
    toast.dismiss(first);
    expect(useToast.getState().toast?.message).toBe('Second');
    toast.dismiss();
    expect(useToast.getState().toast).toBeNull();
  });
});

describe('announcer store', () => {
  it('bumps the id so the same message is announced again', () => {
    const { announce } = useAnnouncer.getState();
    announce('KAN-1 moved');
    const firstId = useAnnouncer.getState().id;
    announce('KAN-1 moved');
    expect(useAnnouncer.getState().id).toBe(firstId + 1);
  });
});

/** A `prefers-color-scheme: dark` query whose answer the test changes. */
function stubColorScheme(initialDark: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | null = null;
  const query = {
    matches: initialDark,
    addEventListener: (_type: string, fn: (event: MediaQueryListEvent) => void) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
  };
  vi.stubGlobal('matchMedia', () => query);
  return {
    change(dark: boolean) {
      query.matches = dark;
      listener?.({ matches: dark } as MediaQueryListEvent);
    },
    get listening() {
      return listener !== null;
    },
  };
}

describe('theme store', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    useTheme.setState({ theme: 'light', source: 'system' });
    document.documentElement.className = 'light';
  });

  it('toggle() swaps the <html> class, cross-fades for 300ms and persists the choice', () => {
    vi.useFakeTimers();
    document.documentElement.className = 'light';
    useTheme.setState({ theme: 'light' });

    useTheme.getState().toggle();

    const root = document.documentElement;
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('light')).toBe(false);
    expect(root.classList.contains('theming')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(root.classList.contains('theming')).toBe(false);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.theme) ?? '{}') as {
      state: Record<string, unknown>;
    };
    expect(saved.state).toEqual({ theme: 'dark', source: 'user' });
  });

  it('follows the OS scheme live until the user picks a theme, then keeps the choice', () => {
    const scheme = stubColorScheme(false);
    const stop = followSystemTheme();
    const root = document.documentElement;

    scheme.change(true);
    expect(useTheme.getState()).toMatchObject({ theme: 'dark', source: 'system' });
    expect(root.classList.contains('dark')).toBe(true);
    scheme.change(false);
    expect(root.classList.contains('light')).toBe(true);

    // An explicit choice stops the following.
    useTheme.getState().toggle();
    expect(useTheme.getState()).toMatchObject({ theme: 'dark', source: 'user' });
    scheme.change(false);
    scheme.change(true);
    scheme.change(false);
    expect(root.classList.contains('dark')).toBe(true);
    expect(useTheme.getState().theme).toBe('dark');

    stop();
    expect(scheme.listening).toBe(false);
  });

  it('colours both theme-color meta tags with the current surface token', () => {
    stubColorScheme(false);
    const metas = ['light', 'dark'].map((scheme) => {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.media = `(prefers-color-scheme: ${scheme})`;
      document.head.append(meta);
      return meta;
    });
    document.documentElement.style.setProperty('--surface', 'rgb(31, 31, 33)');
    try {
      useTheme.getState().setTheme('dark');
      expect(metas.map((meta) => meta.content)).toEqual(['rgb(31, 31, 33)', 'rgb(31, 31, 33)']);
    } finally {
      document.documentElement.style.removeProperty('--surface');
      for (const meta of metas) meta.remove();
    }
  });
});
