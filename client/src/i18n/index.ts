/**
 * i18n public API (RTL & Arabic, plan §11). Typed dictionaries + native Intl; no i18n library.
 *
 *   const t = useT();          t.count.todos(3)        // "3 todos" / "3 بنود"
 *   const format = useFormat(); format.range(a, b)      // "Oct 20 – Nov 2"
 *   const locale = useLocale(); const dir = useDirection();
 *   await setLocale('ar');                              // loads the Arabic chunk, then switches
 *
 * English is bundled; Arabic (messages + IBM Plex Sans Arabic) is a separate chunk loaded with a
 * dynamic import, so English visitors never download it. Components never compare locales
 * (`locale === 'ar'`): differences live in the dictionaries, `format.ts` and CSS (`[dir=rtl]`).
 */
import { useMemo } from 'react';
import { allowedLocale, applyDocumentLocale, useLocaleStore } from '@/stores/locale';
import { dirOf, type Direction, type Locale } from './config';
import { createFormatter, type Formatter } from './format';
import { en, type Messages } from './messages/en';
import { shapeDifferences } from './parity';

export type { Direction, Locale } from './config';
export { LOCALES, dirOf, isLocale } from './config';
export type { Formatter } from './format';
export { LANGUAGE_NAMES } from './messages/languages';
export type { Messages } from './messages/en';

const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => Promise.resolve(en),
  ar: () => import('./messages/ar').then((module) => module.ar),
};

const loaded = new Map<Locale, Messages>([['en', en]]);

/** Loads (once) and returns a locale's messages. Rejects when its chunk can't be downloaded. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const cached = loaded.get(locale);
  if (cached) return cached;
  const messages = await loaders[locale]();
  if (import.meta.env.DEV) {
    const problems = shapeDifferences(en, messages);
    if (problems.length > 0) {
      throw new Error(`messages/${locale}.ts doesn't match en.ts:\n${problems.join('\n')}`);
    }
  }
  loaded.set(locale, messages);
  return messages;
}

/**
 * Switches the UI language, keeping the current screen (no navigation). The messages load first,
 * so nothing renders half-translated. With the Arabic flag off it stays English.
 */
export async function setLocale(locale: Locale): Promise<void> {
  const next = allowedLocale(locale);
  await loadMessages(next);
  useLocaleStore.getState().commit(next);
}

/**
 * Called once before the first render (main.tsx): a saved Arabic choice loads its messages
 * first, so the app never paints English then flips. Never rejects: if the chunk fails, English.
 */
export async function initLocale(): Promise<void> {
  const { locale } = useLocaleStore.getState();
  try {
    await loadMessages(locale);
  } catch {
    useLocaleStore.getState().commit('en');
    return;
  }
  applyDocumentLocale(locale);
}

/** The messages of a locale already loaded (English as a safety net). */
function messagesOf(locale: Locale): Messages {
  return loaded.get(locale) ?? en;
}

export function useLocale(): Locale {
  return useLocaleStore((s) => s.locale);
}

export function useT(): Messages {
  return messagesOf(useLocale());
}

export function useFormat(): Formatter {
  const locale = useLocale();
  return useMemo(() => createFormatter(locale, messagesOf(locale)), [locale]);
}

/** 'ltr' | 'rtl' for code that can't use CSS (e.g. dnd-kit keyboard deltas, the Radix provider). */
export function useDirection(): Direction {
  return dirOf(useLocale());
}

/** Outside React (toasts from mutation callbacks, document.title helpers). */
export function getT(): Messages {
  return messagesOf(useLocaleStore.getState().locale);
}

export function getFormat(): Formatter {
  const { locale } = useLocaleStore.getState();
  return createFormatter(locale, messagesOf(locale));
}
