import type { Locale } from '../config';

/**
 * Each language's name written in that language (an endonym), the same whatever the current
 * locale: the switcher shows "ع" / "EN" and the sidebar item shows the *other* language's own
 * name ("English" in Arabic, "العربية" in English), as on the Arabic canvas. Kept apart from
 * en.ts / ar.ts so an English visitor can name Arabic without downloading the Arabic chunk.
 * Render them with `lang={locale}` so screen readers switch voice.
 */
interface LanguageName {
  /** The language's own name: "English", "العربية". */
  name: string;
  /** The switcher segment: "EN", "ع". */
  short: string;
  /** The segment's tooltip, in that language. */
  switchTo: string;
}

export const LANGUAGE_NAMES: Readonly<Record<Locale, LanguageName>> = {
  en: { name: 'English', short: 'EN', switchTo: 'Switch to English' },
  ar: { name: 'العربية', short: 'ع', switchTo: 'التبديل إلى العربية' },
};
