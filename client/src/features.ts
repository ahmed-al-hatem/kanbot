/**
 * Build-time feature flags, read in this one place.
 *
 * `VITE_FEATURE_AR=true` turns on Arabic and RTL (the language switchers, a saved Arabic choice).
 * Since R5 it is on in Production and Preview; it stays as a kill switch: built without it, the
 * app runs in English whatever a visitor saved, and no switcher shows (README §12). Read at build
 * time, also by the pre-paint script in index.html. A function, not a constant, so tests can
 * flip it with `vi.stubEnv`.
 */
export function isArabicEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_AR === 'true';
}
