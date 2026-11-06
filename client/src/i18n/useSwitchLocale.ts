import { useState } from 'react';
import { toast } from '@/stores/toast';
import { type Locale } from './config';
import { getT, LANGUAGE_NAMES, setLocale } from './index';

/**
 * Shared by both language switchers. Switching keeps the current screen (no navigation) and
 * focus. While the other language's chunk downloads, `pending` is true (the buttons show
 * `aria-busy`); if it fails, an error toast in the current language says so (CLAUDE.md:
 * every action gives feedback) and nothing changes.
 */
export function useSwitchLocale() {
  const [pending, setPending] = useState<Locale | null>(null);

  const switchTo = async (locale: Locale) => {
    if (pending) return;
    setPending(locale);
    try {
      await setLocale(locale);
    } catch {
      toast.error(getT().language.loadFailed(LANGUAGE_NAMES[locale].name));
    } finally {
      setPending(null);
    }
  };

  return { pending, switchTo };
}
