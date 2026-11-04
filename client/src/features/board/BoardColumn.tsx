import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useId } from 'react';
import { cx } from '@/lib/cx';
import { groupDropId, type DropData } from '@/lib/dnd/sensors';
import { plural } from '@/lib/format';
import type { Todo, TodoStatus } from '@/types/api';
import styles from './Board.module.css';
import { ColumnComposer } from './ColumnComposer';
import type { BoardColumn as Column } from './columns';
import { TodoCard } from './TodoCard';
import type { KeyDirection } from './useBoardMoves';

interface BoardColumnProps {
  column: Column;
  /** Its position (0–3), for the 60ms-per-column stagger. */
  index: number;
  /** The cards to show: the column's, or the drag preview's while dragging. */
  cards: readonly Todo[];
  isOver: boolean;
  highlightIds: readonly string[];
  projectId: string;
  sprintId: string;
  onOpen: (todoId: string) => void;
  onKeyMove: (todo: Todo, direction: KeyDirection) => void;
  onMove: (todo: Todo, status: TodoStatus) => void;
}

/**
 * DESIGN §7 Board column (SPR-4): `role="region"` named "In Progress, 3 todos", status dot,
 * uppercase title, count pill and total points; a sortable list of cards, or a dashed "Drop
 * todos here"; the "Create todo" composer at the bottom. The whole column is a droppable, so
 * an empty column takes a drop.
 */
export function BoardColumn({
  column,
  index,
  cards,
  isOver,
  highlightIds,
  projectId,
  sprintId,
  onOpen,
  onKeyMove,
  onMove,
}: BoardColumnProps) {
  const titleId = useId();
  const { setNodeRef } = useDroppable({
    id: groupDropId(column.id),
    data: { type: 'group', groupId: column.id } satisfies DropData,
  });
  const count = column.todos.length;

  return (
    // A named <section> is a region landmark (DESIGN §10.2).
    <section
      ref={setNodeRef}
      aria-label={`${column.name}, ${plural(count, 'todo')}`}
      className={cx(styles.column, isOver && styles.over)}
    >
      <div className={styles.columnHeader}>
        <span className={cx(styles.dot, styles[column.id])} aria-hidden="true" />
        <h3 id={titleId} className={styles.columnTitle}>
          {column.name}
        </h3>
        <span className={styles.countPill} aria-hidden="true">
          {count}
        </span>
        <span className={styles.columnPoints}>
          {column.points} {column.points === 1 ? 'pt' : 'pts'}
        </span>
      </div>
      <SortableContext id={column.id} items={cards.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
        {cards.length > 0 ? (
          <ul className={styles.cards} aria-labelledby={titleId}>
            {cards.map((todo, row) => (
              <TodoCard
                key={todo.id}
                todo={todo}
                columnId={column.id}
                index={row}
                column={index}
                highlighted={highlightIds.includes(todo.id)}
                onOpen={onOpen}
                onKeyMove={onKeyMove}
                onMove={onMove}
              />
            ))}
          </ul>
        ) : (
          <p className={cx(styles.dropHere, 'kb-rise')}>Drop todos here</p>
        )}
      </SortableContext>
      <ColumnComposer projectId={projectId} sprintId={sprintId} status={column.id} columnName={column.name} />
    </section>
  );
}
