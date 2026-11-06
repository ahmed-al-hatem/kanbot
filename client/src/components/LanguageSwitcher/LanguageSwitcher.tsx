import { isArabicEnabled } from '@/features';
import { LANGUAGE_NAMES, useLocale, useT, type Locale } from '@/i18n';
import { useSwitchLocale } from '@/i18n/useSwitchLocale';
import { cx } from '@/lib/cx';
import styles from './LanguageSwitcher.module.css';

/** Order of the segments, as on the Arabic canvas (ع first: the inline-start side in RTL). */
const SEGMENTS: readonly Locale[] = ['ar', 'en'];

/**
 * Segmented "ع / EN" control next to the theme toggle on the auth pages (Arabic canvas, auth
 * top bar). Each segment is a toggle button named by its language in that language plus its
 * visible text, «EN — English» (`lang` set,
 * so screen readers switch voice); the current one is pressed. Hidden with the Arabic flag off.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useT();
  const locale = useLocale();
  const { pending, switchTo } = useSwitchLocale();

  if (!isArabicEnabled()) return null;

  return (
    <div role="group" aria-label={t.language.label} className={cx(styles.group, className)}>
      {SEGMENTS.map((option) => {
        const language = LANGUAGE_NAMES[option];
        const current = option === locale;
        return (
          <button
            key={option}
            type="button"
            lang={option}
            className={styles.option}
            aria-pressed={current}
            aria-label={language.label}
            aria-busy={pending === option || undefined}
            title={current ? undefined : language.switchTo}
            onClick={() => {
              if (!current) void switchTo(option);
            }}
          >
            {language.short}
          </button>
        );
      })}
    </div>
  );
}
