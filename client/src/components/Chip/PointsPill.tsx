import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import styles from './Chip.module.css';

interface PointsPillProps {
  /** Story points; `null` means not estimated. */
  points: number | null;
  className?: string;
}

/** DESIGN §7 Points pill: min-width 20, 20px tall, 12/600. Read as "3 story points". */
export function PointsPill({ points, className }: PointsPillProps) {
  const t = useT();
  const spoken = points === null ? t.common.notEstimated : t.count.storyPoints(points);
  return (
    <span className={cx(styles.pill, className)}>
      <span aria-hidden="true">{points ?? '–'}</span>
      <span className="visually-hidden">{spoken}</span>
    </span>
  );
}
