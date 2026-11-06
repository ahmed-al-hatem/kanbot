/**
 * Build-time feature flags, read in this one place.
 *
 * `VITE_FEATURE_AR=true` turns on Arabic and RTL (the language switchers, a saved Arabic choice).
 * It is set on Vercel Preview only while the Arabic screens land (PRs R1–R5); production stays
 * English until R5. A function, not a constant, so tests can flip it with `vi.stubEnv`.
 */
export function isArabicEnabled(): boolean {
  return import.meta.env.VITE_FEATURE_AR === 'true';
}
