import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { moveTodo } from '@/api/todos';
import { queryClient } from '@/app/queryClient';
import { applyMove, currentPlace, type MoveTarget } from '@/lib/moveInLists';
import type { Todo } from '@/types/api';
import { qk } from './queryKeys';

interface MoveVariables {
  todoId: string;
  target: MoveTarget;
  /** An Undo: the caller doesn't offer another Undo for it. */
  undo: boolean;
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
  /** The project's todos with the move applied, in the server's order. */
  todos: Todo[];
  undo: boolean;
}

interface MoveHandlers {
  /** Right after the optimistic update: announce, highlight, offer Undo. */
  onApplied?: (move: MoveApplied) => void;
  /** The request failed; the todo is already back where it was. */
  onFailed?: (error: Error, todo: Todo) => void;
}

export const moveMutationKey = (projectId: string) => ['move', projectId] as const;

/**
 * `POST /todos/:id/move` (BL-5, BL-7; plan §5.6, §9.2). Optimistic: the todo moves in the
 * cached project list at once (`applyMove`, the server's rules). The requests share a scope, so
 * two quick moves reach the server in the order they were made — `onMutate` still runs at once,
 * only the requests wait. A failure moves just that todo back (later moves stay) and the lists
 * are refetched once the last pending move settles, never in between.
 */
export function useMoveTodo(projectId: string, { onApplied, onFailed }: MoveHandlers = {}) {
  const listKey = qk.todos(projectId, {});
  const mutationKey = moveMutationKey(projectId);

  const { mutate } = useMutation({
    mutationKey,
    scope: { id: `move-${projectId}` },
    mutationFn: ({ todoId, target }: MoveVariables) =>
      moveTodo(todoId, { sprintId: target.sprintId, position: target.position }),
    onMutate: async ({ todoId, target, undo }): Promise<MoveContext | undefined> => {
      await queryClient.cancelQueries({ queryKey: qk.todos(projectId) });
      const todos = queryClient.getQueryData<Todo[]>(listKey) ?? [];
      const todo = todos.find((item) => item.id === todoId);
      const from = currentPlace(todos, todoId);
      if (!todo || !from) return undefined;
      const next = applyMove(todos, todoId, target);
      queryClient.setQueryData<Todo[]>(listKey, next);
      onApplied?.({ todo, from, target, todos: next, undo });
      return { todo, from };
    },
    onError: (error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData<Todo[]>(listKey, (list) => (list ? applyMove(list, context.todo.id, context.from) : list));
      onFailed?.(error, context.todo);
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
      // Any sprint's board may have gained or lost a card; only the active one is ever fetched.
      void queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });

  return useCallback(
    (todoId: string, target: MoveTarget, options: { undo?: boolean } = {}) => {
      mutate({ todoId, target, undo: options.undo ?? false });
    },
    [mutate],
  );
}
