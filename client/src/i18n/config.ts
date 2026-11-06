/**
 * Locales the app ships, their direction and their `Intl` tag.
 *
 * - `en-US`: the English output the app has always had ("Nov 2", "Oct 20 – Nov 2").
 * - `ar-SY-u-nu-latn`: Levantine month names (كانون الثاني، شباط، آذار…) with Latin digits
 *   (`nu-latn`), as on the Arabic design canvas.
 */
export const LOCALES = ['en', 'ar'] as const;

export type Locale = (typeof LOCALES)[number];

export type Direction = 'ltr' | 'rtl';

/** Every new visitor starts here; the choice is saved, the URL never changes. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Persisted by stores/locale.ts; also read by the pre-paint script in index.html. */
export const LOCALE_STORAGE_KEY = 'kanbot.locale';

interface LocaleConfig {
  dir: Direction;
  /** BCP 47 tag for Intl.DateTimeFormat / NumberFormat / PluralRules. */
  intl: string;
}

export const LOCALE_CONFIG: Readonly<Record<Locale, LocaleConfig>> = {
  en: { dir: 'ltr', intl: 'en-US' },
  ar: { dir: 'rtl', intl: 'ar-SY-u-nu-latn' },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): Direction {
  return LOCALE_CONFIG[locale].dir;
}

export function intlTag(locale: Locale): string {
  return LOCALE_CONFIG[locale].intl;
}
