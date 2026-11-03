import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage, STORAGE_KEYS } from '@/lib/storage';

export type Theme = 'light' | 'dark';

const THEMING_MS = 300;

/** index.html sets the class before first paint; the store starts from it. */
function readThemeClass(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

let themingTimer: ReturnType<typeof setTimeout> | undefined;

/** Swaps the class on <html>, cross-fading colors for 300ms (DESIGN §3.1). */
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
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: readThemeClass(),
      setTheme: (theme) => {
        if (theme === get().theme) return;
        applyTheme(theme, true);
        set({ theme });
      },
      toggle: () => {
        get().setTheme(get().theme === 'dark' ? 'light' : 'dark');
      },
    }),
    {
      name: STORAGE_KEYS.theme,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ theme: state.theme }),
      // Keep <html> in sync if storage held a different value than the class (e.g. edited by hand).
      onRehydrateStorage: () => (state) => {
        if (state && state.theme !== readThemeClass()) applyTheme(state.theme, false);
      },
    },
  ),
);
