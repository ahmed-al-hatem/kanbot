import { Icon } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import type { TodoPriority } from '@/types/api';
import styles from './PriorityLabel.module.css';
import { PRIORITY_ICONS, PRIORITY_LABELS } from './todoMeta';

interface PriorityLabelProps {
  priority: TodoPriority;
  className?: string;
}

/** Priority icon plus its name, so color is never the only signal (backlog rows, cards). */
export function PriorityLabel({ priority, className }: PriorityLabelProps) {
  return (
    <span className={cx(styles.priority, className)}>
      <Icon name={PRIORITY_ICONS[priority]} className={styles[priority]} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
