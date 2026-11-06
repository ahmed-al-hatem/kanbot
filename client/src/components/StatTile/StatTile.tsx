import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './StatTile.module.css';

interface StatTileProps {
  label: string;
  value: ReactNode;
  /** `success` for Completion, `danger` for over capacity. */
  tone?: 'default' | 'success' | 'danger';
  /** `md` = 28/32 metric (Sprints page); `sm` = 22/28 (Complete sprint dialog). */
  size?: 'md' | 'sm';
  /** Position in a row, for the 45ms mount stagger. */
  index?: number;
  className?: string;
}

/** DESIGN §7 Stat tile: sunken, radius 8, label 12 subtlest above a 28/32/700 value; lifts 2px on hover. */
export function StatTile({
  label,
  value,
  tone = 'default',
  size = 'md',
  index,
  className,
}: StatTileProps) {
  return (
    <div
      className={cx(
        styles.tile,
        styles[size],
        'kb-rise',
        index !== undefined && 'kb-stagger',
        className,
      )}
      style={index !== undefined ? ({ '--i': index } as CSSProperties) : undefined}
    >
      <span className={styles.label}>{label}</span>
      <span className={cx(styles.value, styles[tone])}>{value}</span>
    </div>
  );
}
