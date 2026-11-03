import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  /** Any CSS length; numbers are px. */
  inlineSize?: number | string;
  blockSize?: number | string;
  /** `medium` (6px) by default; `xlarge` for cards and tiles, `large` for groups. */
  radius?: 'small' | 'medium' | 'large' | 'xlarge' | 'full';
  /** Fades lower rows of a stack (the canvas uses 1, .7, .4). */
  opacity?: number;
  className?: string;
}

/** DESIGN §7 Skeleton: a `--neutral` block with a shimmer. Always hidden from screen readers. */
export function Skeleton({ inlineSize, blockSize = 16, radius = 'medium', opacity, className }: SkeletonProps) {
  const style: CSSProperties = { inlineSize, blockSize, opacity };
  return <span className={cx(styles.skeleton, styles[radius], className)} style={style} aria-hidden="true" />;
}

interface SkeletonRegionProps {
  /** Spoken as "Loading <label>", e.g. "Loading backlog". */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Container for a page skeleton that copies the real layout (DESIGN §7, §11):
 * `role="status"`, `aria-busy`, and a visually hidden "Loading <page>".
 */
export function SkeletonRegion({ label, children, className }: SkeletonRegionProps) {
  return (
    <div role="status" aria-busy="true" className={cx(styles.region, className)}>
      <span className="visually-hidden">Loading {label}</span>
      {children}
    </div>
  );
}
