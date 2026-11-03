import { cx } from '@/lib/cx';
import styles from './Spinner.module.css';

interface SpinnerProps {
  /** 14 inside buttons and banners (DESIGN §7), 24 for a full-page loader. */
  size?: 14 | 20 | 24;
  /**
   * Announced text, e.g. "Loading your workspace". Without it the spinner is decorative,
   * which is right inside a button that already says "Saving…".
   */
  label?: string;
  className?: string;
}

/** Ring that spins in 700ms, colored by the text around it. */
export function Spinner({ size = 14, label, className }: SpinnerProps) {
  const ring = <span className={cx(styles.spinner, styles[`s${size}`], className)} aria-hidden="true" />;
  if (!label) return ring;
  return (
    <span role="status" className={styles.labelled}>
      {ring}
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
