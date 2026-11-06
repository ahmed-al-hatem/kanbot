import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import styles from './Chip.module.css';

/** `neutral` for type/priority, `danger` for overdue, a lozenge hue for labels. */
export type ChipTone =
  'neutral' | 'danger' | 'blue' | 'purple' | 'green' | 'orange' | 'teal' | 'magenta' | 'gray';

type RemoveProps =
  | { onRemove?: undefined; removeLabel?: undefined }
  | {
      /** Shows a × button (label chips in the todo dialog). */
      onRemove: () => void;
      /** Accessible name of the × button, e.g. "Remove label frontend" (DESIGN §7). */
      removeLabel: string;
    };

type ChipProps = RemoveProps & {
  children: ReactNode;
  /** 12px leading icon. */
  icon?: IconName;
  /** Any other leading node, e.g. a `<TypeIcon size={12} />`. */
  leading?: ReactNode;
  tone?: ChipTone;
  className?: string;
};

/** DESIGN §7 Chip: 22px, radius 4, 12/500, gap 6, icon 12. */
export function Chip({
  children,
  icon,
  leading,
  tone = 'neutral',
  onRemove,
  removeLabel,
  className,
}: ChipProps) {
  return (
    <span className={cx(styles.chip, styles[tone], className)}>
      {icon ? <Icon name={icon} size={12} /> : leading}
      {children}
      {onRemove && (
        <button type="button" className={styles.remove} aria-label={removeLabel} onClick={onRemove}>
          <Icon name="cross" size={12} />
        </button>
      )}
    </span>
  );
}
