import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { IconButton } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { PointsPill } from '@/components/Chip/PointsPill';
import { Icon } from '@/components/Icon/Icon';
import { Menu, MenuItem, MenuSeparator } from '@/components/Menu/Menu';
import { PriorityLabel } from '@/features/todos/PriorityLabel';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { isTempTodo } from '@/hooks/useTodos';
import { useFormat, useT } from '@/i18n';
import { cx } from '@/lib/cx';
import type { DropData } from '@/lib/dnd/sensors';
import { overdueDays } from '@/lib/dates';
import { useHighlight } from '@/stores/highlight';
import { TODO_STATUSES, type Todo, type TodoStatus } from '@/types/api';
import styles from './Board.module.css';
import type { KeyDirection } from './useBoardMoves';

/** DESIGN §8.2 "Dropped card": kbDrop runs 900ms. */
const HIGHLIGHT_MS = 1000;
/** Labels shown on a card before "+N". */
const MAX_LABELS = 2;

export const CARD_HELP_ID = 'board-card-help';

const KEY_DIRECTIONS: Partial<Record<string, KeyDirection>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

interface TodoCardProps {
  todo: Todo;
  /** The column showing the card: its own status, or another column's while it is dragged over it. */
  columnId: TodoStatus;
  /** Just dropped or moved by keyboard: plays `kbDrop` once (DESIGN §7). */
  highlighted: boolean;
  /** Position in its column and the column's index, for the mount stagger (DESIGN §8.2). */
  index: number;
  column: number;
  onOpen: (todoId: string) => void;
  onKeyMove: (todo: Todo, direction: KeyDirection) => void;
  onMove: (todo: Todo, status: TodoStatus) => void;
}

/**
 * DESIGN §7 Todo card (SPR-4, SPR-5): the whole card is a button that opens Todo details —
 * title (3 lines), type, priority, overdue and label chips, then the key (a check-circle when
 * Done) and the points pill. It drags with a mouse or a long press; ← → ↑ ↓ on the focused
 * card move it (DESIGN §10.1). The ⋯ menu ("Move to <status>") sits beside the button, not in
 * it, and is the non-drag alternative. A card that is still being created can't be opened or
 * moved yet.
 */
export const TodoCard = memo(function TodoCard({
  todo,
  columnId,
  highlighted,
  index,
  column,
  onOpen,
  onKeyMove,
  onMove,
}: TodoCardProps) {
  const t = useT();
  const format = useFormat();
  const row = t.backlog.row;
  const clearTodo = useHighlight((s) => s.clearTodo);
  const saving = isTempTodo(todo.id);
  // Open runs once the menu has handed focus back to ⋯ (see Menu), so the dialog returns focus there.
  const pendingOpen = useRef(false);
  const overdue = todo.status === 'done' ? 0 : overdueDays(todo.dueDate);
  const extraLabels = todo.labels.length - MAX_LABELS;
  const done = todo.status === 'done';

  // The board has no keyboard drag sensor (the arrows on the card are the keyboard moves), so
  // the listeners are pointer and touch only, and dnd-kit's handle attributes aren't used.
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: todo.id,
    data: { type: 'row', groupId: columnId } satisfies DropData,
    disabled: { draggable: saving, droppable: false },
  });

  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => {
      clearTodo(todo.id);
    }, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [highlighted, todo.id, clearTodo]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction || saving) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    onKeyMove(todo, direction);
  };

  return (
    <li
      ref={setNodeRef}
      style={
        {
          transform: CSS.Translate.toString(transform),
          transition,
          '--i': index,
          '--col': column,
        } as CSSProperties
      }
      className={cx(
        styles.cardItem,
        'kb-rise kb-stagger',
        isDragging && styles.dragging,
        saving && styles.saving,
      )}
      aria-busy={saving || undefined}
      {...listeners}
    >
      <button
        type="button"
        className={cx(styles.card, highlighted && 'kb-dropped')}
        data-todo-focus={saving ? undefined : todo.id}
        aria-describedby={CARD_HELP_ID}
        aria-disabled={saving || undefined}
        onClick={() => {
          if (!saving) onOpen(todo.id);
        }}
        onKeyDown={onKeyDown}
      >
        <span className={styles.cardTitle}>{todo.title}</span>
        <span className={styles.chips}>
          <Chip leading={<TypeIcon type={todo.type} size={12} decorative />}>
            {t.todos.type[todo.type]}
          </Chip>
          <Chip>
            <PriorityLabel priority={todo.priority} className={styles.chipPriority} />
          </Chip>
          {overdue > 0 && todo.dueDate && (
            <Chip tone="danger" icon="status-warning">
              <span className="visually-hidden">{t.board.card.overdue}</span>
              {format.day(todo.dueDate)}
            </Chip>
          )}
          {todo.labels.slice(0, MAX_LABELS).map((label) => (
            <Chip key={label} tone="gray">
              {label}
            </Chip>
          ))}
          {extraLabels > 0 && (
            <span className={styles.moreLabels}>
              {row.moreLabels(extraLabels)}
              <span className="visually-hidden">
                {row.moreLabelsSpoken(todo.labels.slice(MAX_LABELS).join(row.labelSeparator))}
              </span>
            </span>
          )}
        </span>
        <span className={styles.cardFooter}>
          <span className={styles.cardKey}>
            {done && (
              <Icon
                name="check-circle"
                size={12}
                label={t.todos.status.done}
                className={styles.doneIcon}
              />
            )}
            {saving ? (
              <>
                <span aria-hidden="true">{row.savingGlyph}</span>
                <span className="visually-hidden">{row.saving}</span>
              </>
            ) : (
              todo.key
            )}
          </span>
          <PointsPill points={todo.storyPoints} />
        </span>
      </button>
      {!saving && (
        <span className={styles.cardMenu} data-no-drag>
          <Menu
            label={row.menu(todo.key)}
            onCloseAutoFocus={() => {
              if (!pendingOpen.current) return;
              pendingOpen.current = false;
              onOpen(todo.id);
            }}
            trigger={
              <IconButton
                size="sm"
                icon="show-more-horizontal"
                aria-label={row.actions(todo.key)}
              />
            }
          >
            <MenuItem
              icon="arrow-right"
              onSelect={() => {
                pendingOpen.current = true;
              }}
            >
              {row.open}
            </MenuItem>
            <MenuSeparator />
            {TODO_STATUSES.filter((status) => status !== todo.status).map((status) => (
              <MenuItem
                key={status}
                onSelect={() => {
                  onMove(todo, status);
                }}
              >
                {row.moveTo(t.todos.status[status])}
              </MenuItem>
            ))}
          </Menu>
        </span>
      )}
    </li>
  );
});

/** The card under the pointer while dragging (dnd-kit DragOverlay): same content, no controls. */
export function TodoCardPreview({ todo }: { todo: Todo }) {
  const t = useT();
  return (
    <div className={cx(styles.card, styles.preview)} aria-hidden="true">
      <span className={styles.cardTitle}>{todo.title}</span>
      <span className={styles.chips}>
        <Chip leading={<TypeIcon type={todo.type} size={12} decorative />}>
          {t.todos.type[todo.type]}
        </Chip>
        <Chip>
          <PriorityLabel priority={todo.priority} className={styles.chipPriority} />
        </Chip>
      </span>
      <span className={styles.cardFooter}>
        <span className={styles.cardKey}>{todo.key}</span>
        <PointsPill points={todo.storyPoints} />
      </span>
    </div>
  );
}
