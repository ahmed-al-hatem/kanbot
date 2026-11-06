import { useCallback, useLayoutEffect, useRef } from 'react';
import { todoErrorMessage } from '@/features/todos/todoErrors';
import { todoFocusSelector } from '@/features/todos/todoFocus';
import { useMoveTodo } from '@/hooks/useMoveTodo';
import { getFormat, getT } from '@/i18n';
import type { MoveTarget } from '@/lib/moveInLists';
import { refocusAfterRemoval } from '@/lib/refocus';
import { announce } from '@/stores/announcer';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import type { Todo, TodoStatus } from '@/types/api';
import type { BoardColumn } from './columns';

/**
 * A keyboard move in reading order: `previous` / `next` column (← / → in English, mirrored in
 * Arabic — see `inlineStep`), `up` / `down` inside the column.
 */
export type KeyDirection = 'previous' | 'next' | 'up' | 'down';

/** After a keyboard or menu move the card may remount in another column: put focus back on it (DESIGN §10.3). */
function keepFocusOn(todoId: string) {
  refocusAfterRemoval(() => document.querySelector<HTMLElement>(todoFocusSelector(todoId)));
}

/**
 * Every board move — drop, arrow keys on a focused card, the card ⋯ menu — goes through here
 * (SPR-5): it turns "this column, this index" into the server target, moves the todo
 * optimistically (the header progress and column counts follow from the cache), announces
 * "KAN-21 moved to In Progress, position 2 of 3", plays `kbDrop` on the card and, when the
 * status changed, offers Undo (plan §10 decision 2). The callbacks are stable (they read the
 * latest columns from a ref), so memoized cards don't re-render; their text comes from `getT()`
 * when they run, so it is in the language of that moment (the backlog's `moves` messages).
 */
export function useBoardMoves(
  projectId: string,
  sprintId: string | undefined,
  columns: readonly BoardColumn[] | undefined,
) {
  const markTodo = useHighlight((s) => s.markTodo);
  const latest = useRef({ sprintId, columns });
  useLayoutEffect(() => {
    latest.current = { sprintId, columns };
  });

  // Undo needs `move` itself; the ref breaks the cycle.
  const undoRef = useRef<(todoId: string, from: MoveTarget) => void>(() => undefined);

  const move = useMoveTodo(projectId, {
    onApplied: ({ todo, from, target, board, undo }) => {
      const column = board?.columns[target.status] ?? [];
      const position = column.findIndex((item) => item.id === todo.id) + 1;
      const t = getT();
      const format = getFormat();
      const { moves } = t.backlog;
      const name = t.todos.status[target.status];
      announce(
        position > 0
          ? moves.moved(todo.key, name, format.number(position), format.number(column.length))
          : moves.movedToast(todo.key, name),
      );
      markTodo(todo.id);
      if (target.status === todo.status) return;
      if (undo) {
        toast.success(moves.movedBack(todo.key, name));
        return;
      }
      toast.success(moves.movedToast(todo.key, name), {
        action: {
          label: t.common.undo,
          onClick: () => {
            undoRef.current(todo.id, from);
          },
        },
      });
    },
    onFailed: (error, todo) => {
      const t = getT();
      toast.error(t.backlog.moves.failed(todo.key, todoErrorMessage(error, t)));
    },
  });

  useLayoutEffect(() => {
    undoRef.current = (todoId, from) => {
      move(todoId, from, { undo: true });
      keepFocusOn(todoId);
    };
  }, [move]);

  /** Puts `todo` at `index` of `column` (the index once the todo itself is left out). */
  const moveTo = useCallback(
    (todo: Todo, column: Pick<BoardColumn, 'id'>, index: number) => {
      const current = latest.current.sprintId;
      if (!current) return;
      move(todo.id, { sprintId: current, status: column.id, position: Math.max(0, index) });
    },
    [move],
  );

  /**
   * DESIGN §10.1: the previous / next column at the same index (the arrow pointing at it: ← / →
   * in English, → / ← in Arabic), ↑ / ↓ to reorder in the column. Focus stays on the card.
   */
  const onKeyMove = useCallback(
    (todo: Todo, direction: KeyDirection) => {
      const all = latest.current.columns ?? [];
      const columnIndex = all.findIndex((column) => column.id === todo.status);
      const column = all[columnIndex];
      if (!column) return;
      const row = column.todos.findIndex((item) => item.id === todo.id);
      if (direction === 'previous' || direction === 'next') {
        const next = all[columnIndex + (direction === 'previous' ? -1 : 1)];
        if (!next) {
          announce(getT().board.moves.alreadyIn(todo.key, column.name));
          return;
        }
        moveTo(todo, next, Math.min(row, next.todos.length));
      } else {
        const to = row + (direction === 'up' ? -1 : 1);
        if (to < 0 || to >= column.todos.length) {
          const { moves } = getT().board;
          announce(
            direction === 'up'
              ? moves.atTop(todo.key, column.name)
              : moves.atBottom(todo.key, column.name),
          );
          return;
        }
        moveTo(todo, column, to);
      }
      keepFocusOn(todo.id);
    },
    [moveTo],
  );

  /** The card ⋯ menu "Move to <status>": the top of that column, the non-drag alternative (SPR-5). */
  const onMenuMove = useCallback(
    (todo: Todo, status: TodoStatus) => {
      moveTo(todo, { id: status }, 0);
      keepFocusOn(todo.id);
    },
    [moveTo],
  );

  return { moveTo, onKeyMove, onMenuMove };
}
