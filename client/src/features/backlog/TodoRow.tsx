import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useEffect, useRef, type KeyboardEvent, type KeyboardEventHandler } from 'react';
import { IconButton } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { PointsPill } from '@/components/Chip/PointsPill';
import { Icon } from '@/components/Icon/Icon';
import { Menu, MenuItem, MenuSeparator } from '@/components/Menu/Menu';
import { PriorityLabel } from '@/features/todos/PriorityLabel';
import { TypeIcon } from '@/features/todos/TypeIcon';
import type { BacklogGroupKind } from '@/hooks/useBacklog';
import { isTempTodo } from '@/hooks/useTodos';
import { cx } from '@/lib/cx';
import { useHighlight } from '@/stores/highlight';
import type { Todo } from '@/types/api';
import styles from './Backlog.module.css';
import type { DropData } from '@/lib/dnd/sensors';

/** DESIGN §8.2 "New or moved row": kbAdded runs 1300ms. */
const HIGHLIGHT_MS = 1400;
/** Labels shown in the row before "+N" (the title keeps the room). */
const MAX_LABELS = 2;

export const ROW_HELP_ID = 'backlog-row-help';
/** Why dragging and ↑/↓ are off; the drag handles point at it while a filter is on. */
export const DRAG_OFF_ID = 'backlog-drag-off';

/** A group a row can be sent to from its ⋯ menu. */
export interface MoveTargetGroup {
  id: string;
  name: string;
  kind: BacklogGroupKind;
}

export type RowMove = { kind: 'top' } | { kind: 'bottom' } | { kind: 'group'; groupId: string };

type RowAction = 'open' | 'delete';

/** dnd-kit gives no listeners while dragging is disabled. */
const NO_LISTENERS: Record<string, never> = {};

interface TodoRowProps {
  todo: Todo;
  groupId: string;
  /** Reorder inside the group (Move to top / bottom) — not in the active sprint (the board's job). */
  reorderable: boolean;
  /** Every active / planned sprint and the Backlog; the row leaves out its own group. Stable. */
  moveTargets: readonly MoveTargetGroup[];
  /** Just created or moved: plays `kbAdded` once (DESIGN §7). */
  highlighted: boolean;
  /** While filtering (BL-6): no drag, and ↑/↓ say why instead of moving. */
  dragDisabled: boolean;
  onOpen: (todoId: string) => void;
  onDelete: (todo: Todo) => void;
  onMove: (todo: Todo, move: RowMove) => void;
  onKeyMove: (todo: Todo, direction: 'up' | 'down') => void;
}

/**
 * DESIGN §7 Backlog row (BL-1, BL-5, BL-7): drag handle, type, key, title (a button that opens
 * Todo details; ↑/↓ on it moves the row), labels, priority, points and the ⋯ menu (Open, Move to
 * top / bottom, Move to <sprint> / Backlog, Delete). The whole row drags with a mouse or a long
 * press; the handle also picks it up from the keyboard (Space). A quick-create row that is still
 * saving can't be opened or moved yet.
 */
export const TodoRow = memo(function TodoRow({
  todo,
  groupId,
  reorderable,
  moveTargets,
  highlighted,
  dragDisabled,
  onOpen,
  onDelete,
  onMove,
  onKeyMove,
}: TodoRowProps) {
  const clearTodo = useHighlight((s) => s.clearTodo);
  // Open and Delete run once the menu has handed focus back to ⋯ (see Menu), so the dialog
  // they open returns focus there.
  const pendingAction = useRef<RowAction | null>(null);
  const saving = isTempTodo(todo.id);
  const extraLabels = todo.labels.length - MAX_LABELS;

  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: todo.id,
    data: { type: 'row', groupId } satisfies DropData,
    // The active sprint's order is per status column (the board's), so its rows aren't drop
    // slots: dropping on that group puts the todo at the end of its column.
    disabled: { draggable: dragDisabled || saving, droppable: !reorderable },
  });
  // Pointer and touch start anywhere on the row; the keyboard sensor only on the handle, so
  // Enter and Space on the title still open the todo.
  const { onKeyDown, ...rowListeners } = listeners ?? NO_LISTENERS;
  // dnd-kit types its listeners as plain `Function`s; this one is the keyboard sensor's keydown.
  const handleKeyDown = onKeyDown as KeyboardEventHandler<HTMLButtonElement> | undefined;

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => {
      clearTodo(todo.id);
    }, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [highlighted, todo.id, clearTodo]);

  const onTitleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    onKeyMove(todo, event.key === 'ArrowUp' ? 'up' : 'down');
  };

  const targets = moveTargets.filter((target) => target.id !== groupId);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx(
        styles.row,
        !dragDisabled && !saving && styles.draggable,
        highlighted && 'kb-added',
        saving && styles.saving,
        isDragging && styles.dragging,
      )}
      aria-busy={saving || undefined}
      {...rowListeners}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.handle}
        {...attributes}
        // dnd-kit's role="button" is redundant on a real button.
        role={undefined}
        aria-label={`Drag ${todo.key || 'todo'}`}
        aria-describedby={dragDisabled ? DRAG_OFF_ID : attributes['aria-describedby']}
        disabled={dragDisabled || saving}
        onKeyDown={handleKeyDown}
      >
        <Icon name="drag-handle-vertical" />
      </button>
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
            onKeyDown={onTitleKeyDown}
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
      <span className={styles.menuCell} data-no-drag>
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
            {reorderable && (
              <>
                <MenuItem
                  onSelect={() => {
                    onMove(todo, { kind: 'top' });
                  }}
                >
                  Move to top
                </MenuItem>
                <MenuItem
                  onSelect={() => {
                    onMove(todo, { kind: 'bottom' });
                  }}
                >
                  Move to bottom
                </MenuItem>
              </>
            )}
            {targets.map((target) => (
              <MenuItem
                key={target.id}
                icon={target.kind === 'backlog' ? 'backlog' : 'sprint'}
                onSelect={() => {
                  onMove(todo, { kind: 'group', groupId: target.id });
                }}
              >
                Move to {target.name}
              </MenuItem>
            ))}
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

/** The row under the pointer while dragging (dnd-kit DragOverlay): same cells, no controls. */
export function TodoRowPreview({ todo }: { todo: Todo }) {
  return (
    <div className={cx(styles.row, styles.preview)} aria-hidden="true">
      <span className={styles.handle}>
        <Icon name="drag-handle-vertical" />
      </span>
      <span className={styles.typeCell}>
        <TypeIcon type={todo.type} />
      </span>
      <span className={styles.key}>{todo.key}</span>
      <span className={styles.titleCell}>
        <span className={styles.title}>{todo.title}</span>
      </span>
      <PriorityLabel priority={todo.priority} className={styles.priority} />
      <PointsPill points={todo.storyPoints} className={styles.points} />
      <span className={styles.menuCell} />
    </div>
  );
}
