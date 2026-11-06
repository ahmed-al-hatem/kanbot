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
  /**
   * The segment's accessible name: the visible text first, then the language's name, so speech
   * input ("click EN") finds it (WCAG 2.5.3, axe `label-content-name-mismatch`). Not in
   * parentheses: axe ignores parenthesised words when it compares.
   */
  label: string;
  /** The segment's tooltip, in that language. */
  switchTo: string;
}

export const LANGUAGE_NAMES: Readonly<Record<Locale, LanguageName>> = {
  en: { name: 'English', short: 'EN', label: 'EN — English', switchTo: 'Switch to English' },
  ar: { name: 'العربية', short: 'ع', label: 'ع — العربية', switchTo: 'التبديل إلى العربية' },
};
