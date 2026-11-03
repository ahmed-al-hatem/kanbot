import { cx } from '@/lib/cx';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Sprint 3 progress". */
  label: string;
  /** Spoken value, e.g. "18 of 32 points done". Defaults to a percentage. */
  valueText?: string;
  /** 4 in lists and tiles, 8 in headers (DESIGN §7: 6–8px). */
  height?: 4 | 6 | 8;
  /** Plan sprint over capacity: the fill turns `--danger-icon`. */
  over?: boolean;
  className?: string;
}

/** DESIGN §7 Progress bar: pill track `--progress`, fill `--progress-done`, width eases over 500ms. */
export function ProgressBar({ value, max, label, valueText, height = 6, over = false, className }: ProgressBarProps) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
      className={cx(styles.track, styles[`h${height}`], className)}
    >
      <span
        className={cx(styles.fill, over && styles.over)}
        style={{ inlineSize: `${(ratio * 100).toFixed(1)}%` }}
      />
    </div>
  );
}
