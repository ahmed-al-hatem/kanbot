import { describe, expect, it, vi } from 'vitest';
import { getT, initLocale, setLocale } from '@/i18n';
import { ar } from '@/i18n/messages/ar';
import { en } from '@/i18n/messages/en';
import { STORAGE_KEYS } from '@/lib/storage';
import { useLocaleStore } from './locale';

const html = document.documentElement;

function saved(): unknown {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.locale) ?? 'null');
}

async function rehydrateWith(locale: string) {
  window.localStorage.setItem(STORAGE_KEYS.locale, JSON.stringify({ state: { locale }, version: 0 }));
  await useLocaleStore.persist.rehydrate();
}

describe('locale store', () => {
  it('starts a new visitor in English, LTR', async () => {
    window.localStorage.removeItem(STORAGE_KEYS.locale);
    await useLocaleStore.persist.rehydrate();
    expect(useLocaleStore.getState().locale).toBe('en');
    expect(html.lang).toBe('en');
    expect(html.dir).toBe('ltr');
    expect(STORAGE_KEYS.locale).toBe('kanbot.locale');
  });

  it('switches to Arabic: loads its messages, saves the choice and sets <html lang dir>', async () => {
    vi.stubEnv('VITE_FEATURE_AR', 'true');
    await setLocale('ar');
    expect(useLocaleStore.getState().locale).toBe('ar');
    expect(getT()).toBe(ar);
    expect(html.lang).toBe('ar');
    expect(html.dir).toBe('rtl');
    expect(saved()).toMatchObject({ state: { locale: 'ar' } });

    await setLocale('en');
    expect(getT()).toBe(en);
    expect(html.lang).toBe('en');
    expect(html.dir).toBe('ltr');
    expect(saved()).toMatchObject({ state: { locale: 'en' } });
  });

  it('restores a saved Arabic choice and loads it before the first render', async () => {
    vi.stubEnv('VITE_FEATURE_AR', 'true');
    await rehydrateWith('ar');
    await initLocale();
    expect(useLocaleStore.getState().locale).toBe('ar');
    expect(getT()).toBe(ar);
    expect(html.dir).toBe('rtl');
  });

  it('ignores an unknown saved value', async () => {
    vi.stubEnv('VITE_FEATURE_AR', 'true');
    await rehydrateWith('fr');
    expect(useLocaleStore.getState().locale).toBe('en');
  });

  it('with the flag off, runs in English whatever is stored', async () => {
    await rehydrateWith('ar');
    expect(useLocaleStore.getState().locale).toBe('en');
    expect(html.lang).toBe('en');
    expect(html.dir).toBe('ltr');

    await setLocale('ar');
    expect(useLocaleStore.getState().locale).toBe('en');
    expect(getT()).toBe(en);
  });
});
