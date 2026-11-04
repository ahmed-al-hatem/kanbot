import { memo, useEffect, useRef } from 'react';
import { IconButton } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { PointsPill } from '@/components/Chip/PointsPill';
import { Menu, MenuItem, MenuSeparator } from '@/components/Menu/Menu';
import { PriorityLabel } from '@/features/todos/PriorityLabel';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { isTempTodo } from '@/hooks/useTodos';
import { cx } from '@/lib/cx';
import { useHighlight } from '@/stores/highlight';
import type { Todo } from '@/types/api';
import styles from './Backlog.module.css';

/** DESIGN §8.2 "New or moved row": kbAdded runs 1300ms. */
const HIGHLIGHT_MS = 1400;
/** Labels shown in the row before "+N" (the title keeps the room). */
const MAX_LABELS = 2;

export const ROW_HELP_ID = 'backlog-row-help';

type RowAction = 'open' | 'delete';

interface TodoRowProps {
  todo: Todo;
  /** Just created: plays `kbAdded` once (DESIGN §7). */
  highlighted: boolean;
  onOpen: (todoId: string) => void;
  onDelete: (todo: Todo) => void;
}

/**
 * DESIGN §7 Backlog row (BL-1): type, key, title (a button that opens Todo details, one line
 * with an ellipsis), labels, priority, points and the ⋯ menu (Open, Delete). A quick-create
 * row that is still saving shows without its key and can't be opened yet.
 */
export const TodoRow = memo(function TodoRow({ todo, highlighted, onOpen, onDelete }: TodoRowProps) {
  const clearTodo = useHighlight((s) => s.clearTodo);
  // Open and Delete run once the menu has handed focus back to ⋯ (see Menu), so the dialog
  // they open returns focus there.
  const pendingAction = useRef<RowAction | null>(null);
  const saving = isTempTodo(todo.id);
  const extraLabels = todo.labels.length - MAX_LABELS;

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => {
      clearTodo(todo.id);
    }, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [highlighted, todo.id, clearTodo]);

  return (
    <li className={cx(styles.row, highlighted && 'kb-added', saving && styles.saving)} aria-busy={saving || undefined}>
      <span className={styles.typeCell}>
        <TypeIcon type={todo.type} />
      </span>
      <span className={styles.key}>
        {saving ? (
          <>
            <span aria-hidden="true">…</span>
            <span className="visually-hidden">Saving</span>
          </>
        ) : (
          todo.key
        )}
      </span>
      <span className={styles.titleCell}>
        {saving ? (
          <span className={styles.title}>{todo.title}</span>
        ) : (
          <button
            type="button"
            className={styles.title}
            data-todo-focus={todo.id}
            aria-describedby={ROW_HELP_ID}
            onClick={() => {
              onOpen(todo.id);
            }}
          >
            {todo.title}
          </button>
        )}
        {todo.labels.length > 0 && (
          <span className={styles.labels}>
            {todo.labels.slice(0, MAX_LABELS).map((label) => (
              <Chip key={label} tone="gray" className={styles.label}>
                {label}
              </Chip>
            ))}
            {extraLabels > 0 && (
              <span className={styles.moreLabels}>
                +{extraLabels}
                <span className="visually-hidden"> more labels: {todo.labels.slice(MAX_LABELS).join(', ')}</span>
              </span>
            )}
          </span>
        )}
      </span>
      <PriorityLabel priority={todo.priority} className={styles.priority} />
      <PointsPill points={todo.storyPoints} className={styles.points} />
      <span className={styles.menuCell}>
        {!saving && (
          <Menu
            label={`${todo.key} actions`}
            onCloseAutoFocus={() => {
              const action = pendingAction.current;
              pendingAction.current = null;
              if (action === 'open') onOpen(todo.id);
              if (action === 'delete') onDelete(todo);
            }}
            trigger={<IconButton size="sm" icon="show-more-horizontal" aria-label={`Actions for ${todo.key}`} />}
          >
            <MenuItem
              icon="arrow-right"
              onSelect={() => {
                pendingAction.current = 'open';
              }}
            >
              Open
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon="delete"
              tone="danger"
              onSelect={() => {
                pendingAction.current = 'delete';
              }}
            >
              Delete
            </MenuItem>
          </Menu>
        )}
      </span>
    </li>
  );
});
