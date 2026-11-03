import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Lozenge.module.css';

/**
 * Hues from `--lz-<hue>-bg/-fg` (DESIGN §3.3). Sprint status: Planned → gray,
 * Active → blue (with `live`), Completed → green. Project key → gray.
 */
export type LozengeTone = 'gray' | 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'magenta';

interface LozengeProps {
  children: ReactNode;
  tone?: LozengeTone;
  /** The pulsing 6px dot of the Active sprint lozenge. */
  live?: boolean;
  className?: string;
}

/** DESIGN §7 Lozenge: 20px, padding 0 6, radius 4, 11/700 uppercase, +0.2px. */
export function Lozenge({ children, tone = 'gray', live = false, className }: LozengeProps) {
  return (
    <span className={cx(styles.lozenge, styles[tone], className)}>
      {live && <span className={cx(styles.dot, 'kb-live')} aria-hidden="true" />}
      {children}
    </span>
  );
}
