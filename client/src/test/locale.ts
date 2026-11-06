import type { MatcherFunction } from '@testing-library/react';
import { vi } from 'vitest';
import { setLocale } from '@/i18n';
import { stripIsolates } from '@/i18n/bidi';

/**
 * Turns the Arabic flag on and switches the UI to Arabic before a render (setup.ts puts the
 * flag off and English back before every test). Loads the Arabic chunk, as the app does.
 */
export async function switchToArabic() {
  vi.stubEnv('VITE_FEATURE_AR', 'true');
  await setLocale('ar');
}

/**
 * A text matcher for an Arabic sentence with isolated values (i18n/bidi.ts): it matches the
 * element whose whole text is `text` — the `<bdi>` pieces from `BidiText` and any isolation
 * marks ignored — and not its ancestors. `screen.findByText(sentence('KAN-22 نُقل إلى …'))`.
 */
export function sentence(text: string): MatcherFunction {
  const same = (node: Element | null) =>
    node !== null && stripIsolates(node.textContent).trim() === text;
  return (_content, element) =>
    same(element) && !Array.from(element?.children ?? []).some((child) => same(child));
}
