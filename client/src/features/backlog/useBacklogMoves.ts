import { useCallback, useLayoutEffect, useRef } from 'react';
import { todoErrorMessage } from '@/features/todos/todoErrors';
import { todoFocusSelector } from '@/features/todos/todoFocus';
import type { BacklogGroup } from '@/hooks/useBacklog';
import { useMoveTodo } from '@/hooks/useMoveTodo';
import { getFormat, getT } from '@/i18n';
import { dropTarget, type MoveTarget } from '@/lib/moveInLists';
import { refocusAfterRemoval } from '@/lib/refocus';
import { announce } from '@/stores/announcer';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import type { Todo } from '@/types/api';
import type { RowMove } from './TodoRow';

/** After a keyboard or menu move the row may remount in another group: put focus back on it (DESIGN §10.3). */
function keepFocusOn(todoId: string) {
  refocusAfterRemoval(() => document.querySelector<HTMLElement>(todoFocusSelector(todoId)));
}

/** The todo's group, the group's index and the todo's row in it. */
function findPlace(groups: readonly BacklogGroup[] | undefined, todo: Todo) {
  const all = groups ?? [];
  const index = all.findIndex((group) => group.todos.some((item) => item.id === todo.id));
  const group = all[index];
  return group
    ? { all, index, group, row: group.todos.findIndex((item) => item.id === todo.id) }
    : null;
}

/**
 * Every backlog move — drop, ↑/↓ on a row title, the row ⋯ menu — goes through here (BL-5,
 * BL-7): it turns "this group, this index" into the server target (`dropTarget`), moves the todo
 * optimistically, announces "KAN-21 moved to Sprint 3, position 2 of 5", highlights the row
 * (`kbAdded`) and, when it changed group, offers Undo (plan §10 decision 2). The callbacks are
 * stable (they read the latest groups from a ref), so memoized rows don't re-render; their text
 * comes from `getT()` when they run, so it is in the language of that moment.
 */
export function useBacklogMoves(
  projectId: string,
  groups: readonly BacklogGroup[] | undefined,
  filtering: boolean,
) {
  const markTodo = useHighlight((s) => s.markTodo);
  const latest = useRef({ groups, filtering });
  useLayoutEffect(() => {
    latest.current = { groups, filtering };
  });

  const nameOf = (sprintId: string | null) => {
    const { backlog } = getT();
    return sprintId === null
      ? backlog.groupName
      : (latest.current.groups?.find((group) => group.id === sprintId)?.name ??
          backlog.fallbackSprint);
  };

  // Undo needs `move` itself; the ref breaks the cycle.
  const undoRef = useRef<(todoId: string, from: MoveTarget) => void>(() => undefined);

  const move = useMoveTodo(projectId, {
    onApplied: ({ todo, from, target, todos, undo }) => {
      const rows = todos.filter((item) => item.sprintId === target.sprintId);
      const position = rows.findIndex((item) => item.id === todo.id) + 1;
      const name = nameOf(target.sprintId);
      const t = getT();
      const format = getFormat();
      const { moves } = t.backlog;
      announce(moves.moved(todo.key, name, format.number(position), format.number(rows.length)));
      markTodo(todo.id);
      if (target.sprintId === todo.sprintId) return;
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

  /** Puts `todo` at `index` of `group`'s rows (`rows` = those rows after the move, for a drop). */
  const moveTo = useCallback(
    (todo: Todo, group: BacklogGroup, index: number, rows: readonly Todo[] = group.todos) => {
      move(todo.id, dropTarget(rows, todo, group.sprint?.id ?? null, index));
    },
    [move],
  );

  /** ↑/↓ on a focused row (DESIGN §10.1): reorder, and cross into the previous / next group at the edges. */
  const onKeyMove = useCallback(
    (todo: Todo, direction: 'up' | 'down') => {
      if (latest.current.filtering) {
        announce(getT().backlog.dragOff);
        return;
      }
      const place = findPlace(latest.current.groups, todo);
      if (!place) return;
      const { all, index, group, row } = place;
      // The active sprint is ordered by status column on the board: from it, ↑/↓ only leave it.
      const reorderable = group.kind !== 'active';
      if (direction === 'up') {
        const previous = all[index - 1];
        if (reorderable && row > 0) moveTo(todo, group, row - 1);
        else if (previous) moveTo(todo, previous, previous.todos.length);
        else {
          announce(getT().backlog.moves.atTop(todo.key));
          return;
        }
      } else {
        const next = all[index + 1];
        if (reorderable && row < group.todos.length - 1) moveTo(todo, group, row + 1);
        else if (next) moveTo(todo, next, 0);
        else {
          announce(getT().backlog.moves.atBottom(todo.key));
          return;
        }
      }
      keepFocusOn(todo.id);
    },
    [moveTo],
  );

  /** The row ⋯ menu: works while filtering too (it uses the whole group, not the visible rows). */
  const onMenuMove = useCallback(
    (todo: Todo, request: RowMove) => {
      const place = findPlace(latest.current.groups, todo);
      if (!place) return;
      const { all, group, row } = place;
      if (request.kind === 'group') {
        const target = all.find((item) => item.id === request.groupId);
        if (target) moveTo(todo, target, 0);
      } else {
        const index = request.kind === 'top' ? 0 : group.todos.length - 1;
        if (index === row) {
          const { moves } = getT().backlog;
          announce(request.kind === 'top' ? moves.atTop(todo.key) : moves.atBottom(todo.key));
          return;
        }
        moveTo(todo, group, index);
      }
      keepFocusOn(todo.id);
    },
    [moveTo],
  );

  return { moveTo, onKeyMove, onMenuMove };
}
