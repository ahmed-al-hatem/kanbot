import { cx } from '@/lib/cx';
import styles from './Logo.module.css';

interface LogoProps {
  /** 36 on the auth card, 28 in the sidebar, 24 in the mobile bar (DESIGN §5.4). */
  size?: 24 | 28 | 36;
  /** Show the "Kanbot" wordmark next to the mark. */
  wordmark?: boolean;
}

/** Robot head whose face is a mini kanban board. Same colors in both themes. */
export function Logo({ size = 28, wordmark = false }: LogoProps) {
  const mark = (
    <svg className={styles.mark} width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="112" className={styles.bg} />
      <rect x="248" y="100" width="16" height="60" rx="8" className={styles.fg} />
      <circle cx="256" cy="94" r="26" className={styles.accent} />
      <rect x="78" y="232" width="44" height="88" rx="16" className={styles.fg} />
      <rect x="390" y="232" width="44" height="88" rx="16" className={styles.fg} />
      <rect x="104" y="148" width="304" height="252" rx="68" className={styles.fg} />
      <rect x="144" y="190" width="224" height="168" rx="40" className={styles.bg} />
      <rect x="176" y="220" width="40" height="108" rx="12" className={styles.fg} />
      <rect x="236" y="220" width="40" height="76" rx="12" className={styles.fg} />
      <rect x="296" y="220" width="40" height="46" rx="12" className={styles.accent} />
    </svg>
  );

  if (!wordmark) {
    return (
      <span role="img" aria-label="Kanbot" className={styles.logo}>
        {mark}
      </span>
    );
  }
  return (
    <span className={styles.logo}>
      {mark}
      <span className={cx(styles.wordmark, size === 36 && styles.large)}>Kanbot</span>
    </span>
  );
}
