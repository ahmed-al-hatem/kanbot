import { Icon } from '@/components/Icon/Icon';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import type { TodoPriority } from '@/types/api';
import styles from './PriorityLabel.module.css';
import { PRIORITY_ICONS } from './todoMeta';

interface PriorityLabelProps {
  priority: TodoPriority;
  className?: string;
}

/** Priority icon plus its name, so color is never the only signal (backlog rows, cards). */
export function PriorityLabel({ priority, className }: PriorityLabelProps) {
  const t = useT();
  return (
    <span className={cx(styles.priority, className)}>
      <Icon name={PRIORITY_ICONS[priority]} className={styles[priority]} />
      {t.todos.priority[priority]}
    </span>
  );
}
