import { Icon } from '@/components/Icon/Icon';
import { isArabicEnabled } from '@/features';
import { LANGUAGE_NAMES, useLocale, useT, type Locale } from '@/i18n';
import { useSwitchLocale } from '@/i18n/useSwitchLocale';
import { cx } from '@/lib/cx';
import styles from './AppShell.module.css';

/** The language the item offers: the other one (two locales today). */
const OTHER: Readonly<Record<Locale, Locale>> = { en: 'ar', ar: 'en' };

/**
 * The sidebar's "English · اللغة" item (Arabic canvas), above the profile: a globe and the other
 * language's own name, in that language. Its accessible name adds "Change language" in the
 * current one. Switching keeps the current page. Hidden with the Arabic flag off.
 */
export function LanguageNavItem() {
  const t = useT();
  const locale = useLocale();
  const { pending, switchTo } = useSwitchLocale();

  if (!isArabicEnabled()) return null;

  const target = OTHER[locale];
  const name = LANGUAGE_NAMES[target].name;
  const label = t.language.change(name);

  return (
    <button
      type="button"
      className={cx(styles.navItem, styles.langItem, pending && styles.langItemBusy)}
      aria-label={label}
      aria-busy={pending !== null || undefined}
      data-tip={label}
      onClick={() => {
        void switchTo(target);
      }}
    >
      <Icon name="globe" className={cx(styles.navIcon, styles.langIcon)} />
      <span className={styles.navLabel} lang={target}>
        {name}
      </span>
    </button>
  );
}
