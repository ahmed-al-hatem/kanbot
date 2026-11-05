import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage, STORAGE_KEYS } from '@/lib/storage';

export type Theme = 'light' | 'dark';

/** `system` follows `prefers-color-scheme`, live; `user` is a choice made with the toggle. */
export type ThemeSource = 'system' | 'user';

const THEMING_MS = 300;
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** index.html sets the class before first paint; the store starts from it. */
function readThemeClass(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function darkQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
}

export function systemTheme(): Theme {
  return darkQuery()?.matches ? 'dark' : 'light';
}

/**
 * The browser's address bar follows the app's theme, not only the OS one: both
 * `<meta name="theme-color">` tags (one per `media` in index.html) get the current `--surface`.
 */
function syncThemeColor() {
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
  if (!surface) return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = surface;
  }
}

let themingTimer: ReturnType<typeof setTimeout> | undefined;

/** Swaps the class on <html>, cross-fading colors for 300ms (DESIGN §3.1, §8.2). */
function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theming');
    clearTimeout(themingTimer);
    themingTimer = setTimeout(() => {
      root.classList.remove('theming');
    }, THEMING_MS);
  }
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  syncThemeColor();
}

interface ThemeState {
  theme: Theme;
  /** Until the user picks a theme, the app follows the OS (and keeps following it). */
  source: ThemeSource;
  /** An explicit choice: stops following the OS. */
  setTheme: (theme: Theme) => void;
  toggle: () => void;
  /** The OS scheme changed: applied only while the user hasn't chosen. */
  followSystem: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: readThemeClass(),
      source: 'system',
      setTheme: (theme) => {
        if (theme !== get().theme) applyTheme(theme, true);
        set({ theme, source: 'user' });
      },
      toggle: () => {
        get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
      },
      followSystem: (theme) => {
        if (get().source === 'user' || theme === get().theme) return;
        applyTheme(theme, true);
        set({ theme });
      },
    }),
    {
      name: STORAGE_KEYS.theme,
      storage: createJSONStorage(() => safeStorage),
      // A value saved before `source` existed was always a toggle, i.e. a choice.
      version: 1,
      migrate: (persisted) => {
        const saved = persisted as { theme?: unknown } | null;
        return { theme: saved?.theme === 'dark' ? 'dark' : 'light', source: 'user' } as const;
      },
      partialize: (state) => ({ theme: state.theme, source: state.source }),
      // Keep <html> in sync if storage held a different value than the class (e.g. edited by hand).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.source === 'system' && state.theme !== systemTheme()) {
          state.followSystem(systemTheme());
        } else if (state.theme !== readThemeClass()) {
          applyTheme(state.theme, false);
        }
      },
    },
  ),
);

/**
 * Follows `prefers-color-scheme` changes while the user hasn't picked a theme (called once from
 * main.tsx; returns the cleanup for tests). Also colours the address bar for the first time.
 */
export function followSystemTheme(): () => void {
  syncThemeColor();
  const query = darkQuery();
  if (!query) return () => undefined;
  const onChange = (event: MediaQueryListEvent) => {
    useTheme.getState().followSystem(event.matches ? 'dark' : 'light');
  };
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}
