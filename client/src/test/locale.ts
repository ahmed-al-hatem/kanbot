import { vi } from 'vitest';
import { setLocale } from '@/i18n';

/**
 * Turns the Arabic flag on and switches the UI to Arabic before a render (setup.ts puts the
 * flag off and English back before every test). Loads the Arabic chunk, as the app does.
 */
export async function switchToArabic() {
  vi.stubEnv('VITE_FEATURE_AR', 'true');
  await setLocale('ar');
}
