import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { moveTodo } from '@/api/todos';
import { queryClient } from '@/app/queryClient';
import { boardTodos } from '@/lib/board';
import { applyMove, currentPlace, type MoveTarget } from '@/lib/moveInLists';
import type { SprintBoardResponse, Todo } from '@/types/api';
import { findBoardTodo, moveInCachedBoards } from './useBoard';
import { qk } from './queryKeys';

interface MoveVariables {
  todoId: string;
  target: MoveTarget;
  /** An Undo: the caller doesn't offer another Undo for it. */
  undo: boolean;
  /** The move changes the status (a board column): only then is `status` sent. */
  sendStatus: boolean;
}

interface MoveContext {
  /** The todo as it was before this move. */
  todo: Todo;
  /** Where it was: moving it there again undoes this move. */
  from: MoveTarget;
}

export interface MoveApplied {
  /** The todo before the move. */
  todo: Todo;
  from: MoveTarget;
  target: MoveTarget;
  /** The project's todos with the move applied, in the server's order (empty when that list isn't cached). */
  todos: Todo[];
  /** The target sprint's board with the move applied, when it is cached. */
  board: SprintBoardResponse | undefined;
  undo: boolean;
}

interface MoveHandlers {
  /** Right after the optimistic update: announce, highlight, offer Undo. */
  onApplied?: (move: MoveApplied) => void;
  /** The request failed; the todo is already back where it was. */
  onFailed?: (error: Error, todo: Todo) => void;
}

export const moveMutationKey = (projectId: string) => ['move', projectId] as const;

/** The todo and where it is, from the project list if cached, else from a cached board. */
function locate(projectId: string, todoId: string): { todo: Todo; from: MoveTarget } | undefined {
  const list = queryClient.getQueryData<Todo[]>(qk.todos(projectId, {}));
  const inList = list?.find((item) => item.id === todoId);
  if (list && inList) {
    const from = currentPlace(list, todoId);
    return from && { todo: inList, from };
  }
  const cached = findBoardTodo(todoId);
  const board = cached?.todo.sprintId
    ? queryClient.getQueryData<SprintBoardResponse>(qk.board(cached.todo.sprintId))
    : undefined;
  const from = board && currentPlace(boardTodos(board), todoId);
  return cached && from ? { todo: cached.todo, from } : undefined;
}

/**
 * `POST /todos/:id/move` (BL-5, BL-7, SPR-5; plan §5.6, §9.2). Optimistic: the todo moves at
 * once in the cached project list and in every cached board (`applyMove`, the server's rules),
 * so the board's columns, counts and progress follow before the server answers. The requests
 * share one scope per project — backlog and board alike — so two quick moves reach the server
 * in the order they were made; `onMutate` still runs at once, only the requests wait. A failure
 * moves just that todo back (later moves stay), and the lists are refetched once the last
 * pending move settles, never in between.
 */
export function useMoveTodo(projectId: string, { onApplied, onFailed }: MoveHandlers = {}) {
  const listKey = qk.todos(projectId, {});
  const mutationKey = moveMutationKey(projectId);

  const { mutate } = useMutation({
    mutationKey,
    scope: { id: `move-${projectId}` },
    mutationFn: ({ todoId, target, sendStatus }: MoveVariables) =>
      moveTodo(todoId, {
        sprintId: target.sprintId,
        ...(sendStatus ? { status: target.status } : {}),
        position: target.position,
      }),
    onMutate: async ({ todoId, target, undo }): Promise<MoveContext | undefined> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: qk.todos(projectId) }),
        queryClient.cancelQueries({ queryKey: ['board'] }),
      ]);
      const place = locate(projectId, todoId);
      if (!place) return undefined;
      const { todo, from } = place;
      const list = queryClient.getQueryData<Todo[]>(listKey);
      const next = list ? applyMove(list, todoId, target) : [];
      if (list) queryClient.setQueryData<Todo[]>(listKey, next);
      const board = moveInCachedBoards(todoId, todo, target);
      onApplied?.({ todo, from, target, todos: next, board, undo });
      return { todo, from };
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      const { todo, from } = context;
      queryClient.setQueryData<Todo[]>(listKey, (list) =>
        list ? applyMove(list, todo.id, from) : list,
      );
      moveInCachedBoards(todo.id, todo, from);
      onFailed?.(error, todo);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(qk.todo(saved.id), saved);
    },
    onSettled: () => {
      // Still counted while settling: 1 means this is the last pending move (plan §9.2).
      if (queryClient.isMutating({ mutationKey }) !== 1) return;
      void queryClient.invalidateQueries({ queryKey: qk.todos(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.sprints(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
      void queryClient.invalidateQueries({ queryKey: qk.projects });
      // Any sprint's board may have gained or lost a card.
      void queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });

  return useCallback(
    (todoId: string, target: MoveTarget, options: { undo?: boolean } = {}) => {
      // The status as it will be when this request runs (earlier moves are applied already).
      const current = locate(projectId, todoId)?.todo.status;
      mutate({
        todoId,
        target,
        undo: options.undo ?? false,
        sendStatus: current !== undefined && current !== target.status,
      });
    },
    [mutate, projectId],
  );
}
