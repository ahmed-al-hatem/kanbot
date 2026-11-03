import type { ReactNode } from 'react';
import { IconButton } from '@/components/Button/Button';
import { Logo } from '@/components/Logo/Logo';
import { cx } from '@/lib/cx';
import { useTheme } from '@/stores/theme';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  /** Browser tab title, e.g. "Log in" → "Log in · Kanbot". */
  title: string;
  children: ReactNode;
}

/**
 * DESIGN §9 01/01b/02: a centered 420px card on `--surface-sunken`, the logo on top, the
 * tagline under it and the theme toggle in the corner (as on the canvas).
 */
export function AuthLayout({ title, children }: AuthLayoutProps) {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <title>{`${title} · Kanbot`}</title>
      <IconButton
        icon="theme"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className={styles.theme}
        onClick={toggle}
      />
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
