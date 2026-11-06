import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isArabicEnabled } from '@/features';
import { DEFAULT_LOCALE, dirOf, isLocale, type Locale } from '@/i18n/config';
import { safeStorage, STORAGE_KEYS } from '@/lib/storage';

/**
 * The UI language (UI state only; messages live in i18n/index.ts). Saved under `kanbot.locale`
 * like the theme; the URL never changes. A new visitor starts in English. With the Arabic flag
 * off, the app always runs in English whatever is stored.
 *
 * Don't call `commit` directly: `setLocale()` from `@/i18n` loads the messages first.
 */
interface LocaleState {
  locale: Locale;
  /** Applies a locale whose messages are already loaded (and syncs <html lang dir>). */
  commit: (locale: Locale) => void;
}

/** The locale the app may run in: a known one with the flag on, else English. */
export function allowedLocale(value: unknown): Locale {
  return isArabicEnabled() && isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Keeps <html lang> and <html dir> in step (index.html sets them before first paint). */
export function applyDocumentLocale(locale: Locale) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = dirOf(locale);
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      commit: (locale) => {
        const next = allowedLocale(locale);
        applyDocumentLocale(next);
        set({ locale: next });
      },
    }),
    {
      name: STORAGE_KEYS.locale,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ locale: state.locale }),
      // Unknown values, or Arabic with the flag off, fall back to English.
      merge: (persisted, current) => ({
        ...current,
        locale: allowedLocale((persisted as { locale?: unknown } | undefined)?.locale),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyDocumentLocale(state.locale);
      },
    },
  ),
);
