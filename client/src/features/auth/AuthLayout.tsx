import type { ReactNode } from 'react';
import { IconButton } from '@/components/Button/Button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher';
import { Logo } from '@/components/Logo/Logo';
import { cx } from '@/lib/cx';
import { titleOf, useDocumentTitle } from '@/lib/documentTitle';
import { useTheme } from '@/stores/theme';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  /** Browser tab title, e.g. "Log in" → "Log in · Kanbot". */
  title: string;
  children: ReactNode;
}

/**
 * DESIGN §9 01/01b/02: a centered 420px card on `--surface-sunken`, the logo on top, the
 * tagline under it and the theme toggle in the corner (as on the canvas). With Arabic on, the
 * ع / EN switcher sits before the toggle (Arabic canvas auth top bar).
 */
export function AuthLayout({ title, children }: AuthLayoutProps) {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  useDocumentTitle(titleOf(title));

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <div className={styles.corner}>
        <LanguageSwitcher />
        <IconButton
          icon="theme"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={toggle}
        />
      </div>
      <div className={cx(styles.card, 'kb-rise')}>
        <div className={styles.brand}>
          <Logo size={36} wordmark />
        </div>
        <div className={cx(styles.content, 'kb-page')}>{children}</div>
      </div>
      <p className={styles.tagline}>Your sprint board with an AI teammate.</p>
    </main>
  );
}

interface AuthHeadingProps {
  title: string;
  subtitle?: ReactNode;
}

/** The card's `h1` and its one-line subtitle. */
export function AuthHeading({ title, subtitle }: AuthHeadingProps) {
  return (
    <div className={styles.heading}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
}
