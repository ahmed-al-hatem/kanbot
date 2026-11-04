import { useId, type ReactNode } from 'react';
import { IconButton } from '@/components/Button/Button';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import type { BacklogGroup as Group } from '@/hooks/useBacklog';
import { cx } from '@/lib/cx';
import { formatRange, todosAndPoints } from '@/lib/format';
import type { Todo } from '@/types/api';
import styles from './Backlog.module.css';
import { TodoRow } from './TodoRow';

interface BacklogGroupProps {
  group: Group;
  /** The group's todos that pass the filters. */
  visible: Todo[];
  filtering: boolean;
  collapsed: boolean;
  onToggle: (groupId: string) => void;
  highlightIds: readonly string[];
  onOpen: (todoId: string) => void;
  onDelete: (todo: Todo) => void;
  /** Replaces the "No todos in … yet" line when the group is empty (the Backlog's empty state). */
  empty?: ReactNode;
  /** Under the rows: the Backlog's quick create. */
  footer?: ReactNode;
}

/**
 * DESIGN §7 Backlog group: collapse chevron, title, status lozenge, dates and "N todos · P pts",
 * then its rows. Read-only in phase 4: sprint actions and moves come in phase 5.
 */
export function BacklogGroup({
  group,
  visible,
  filtering,
  collapsed,
  onToggle,
  highlightIds,
  onOpen,
  onDelete,
  empty,
  footer,
}: BacklogGroupProps) {
  const headingId = useId();
  const bodyId = useId();
  const dates = group.sprint ? formatRange(group.sprint.startDate, group.sprint.endDate) : null;

  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <div className={styles.groupHeader}>
        <IconButton
          size="sm"
          icon="chevron-down"
          className={styles.toggle}
          aria-label={`Toggle ${group.name}`}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => {
            onToggle(group.id);
          }}
        />
        <h2 id={headingId} className={styles.groupTitle}>
          {group.name}
        </h2>
        {group.kind === 'active' && (
          <Lozenge tone="blue" live>
            Active
          </Lozenge>
        )}
        {group.kind === 'planned' && <Lozenge>Planned</Lozenge>}
        <span className={styles.groupMeta}>
          {dates && `${dates} · `}
          {todosAndPoints(group.todos.length, group.points)}
        </span>
      </div>

      <div id={bodyId} hidden={collapsed} className={cx('kb-rise', styles.groupBody)}>
        {visible.length > 0 ? (
          <ul className={styles.rows} aria-label={`${group.name} todos`}>
            {visible.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                highlighted={highlightIds.includes(todo.id)}
                onOpen={onOpen}
                onDelete={onDelete}
              />
            ))}
          </ul>
        ) : group.todos.length > 0 && filtering ? (
          <p className={styles.groupMessage}>No todos in {group.name} match your filters</p>
        ) : (
          (empty ?? <p className={styles.groupMessage}>No todos in {group.name} yet</p>)
        )}
        {footer}
      </div>
    </section>
  );
}
