import { queryOptions, useQuery } from '@tanstack/react-query';
import { getBoard } from '@/api/sprints';
import { queryClient } from '@/app/queryClient';
import { boardTodos, withBoardTodos } from '@/lib/board';
import { applyMove, type MoveTarget } from '@/lib/moveInLists';
import type { SprintBoardResponse, Todo } from '@/types/api';
import { qk } from './queryKeys';

export function boardQuery(sprintId: string) {
  return queryOptions({
    queryKey: qk.board(sprintId),
    queryFn: ({ signal }) => getBoard(sprintId, signal),
  });
}

/**
 * `GET /sprints/:id/todos` (SPR-4): the sprint and its todos by status column. The board asks
 * for it with the id from `project.stats.activeSprint`, so it never waits for the sprint list
 * (plan §5.3); the Sprints page uses it for a sprint's todo list.
 */
export function useBoard(sprintId: string | undefined) {
  return useQuery({ ...boardQuery(sprintId ?? ''), enabled: Boolean(sprintId) });
}

/** Every cached board, with its query key. */
function cachedBoards() {
  return queryClient
    .getQueriesData<SprintBoardResponse>({ queryKey: ['board'] })
    .filter((entry): entry is [readonly unknown[], SprintBoardResponse] => entry[1] !== undefined);
}

/**
 * Applies `update` to the flat todo list of every cached board and rebuilds the columns and the
 * live stats (`withBoardTodos`). Returning the same array leaves that board alone.
 */
export function updateCachedBoards(update: (todos: Todo[], board: SprintBoardResponse) => Todo[]) {
  for (const [queryKey, board] of cachedBoards()) {
    const before = boardTodos(board);
    const after = update(before, board);
    if (after !== before) queryClient.setQueryData(queryKey, withBoardTodos(board, after));
  }
}

/** A todo from any cached board, with when that board was fetched. */
export function findBoardTodo(todoId: string): { todo: Todo; updatedAt: number } | undefined {
  for (const [queryKey, board] of cachedBoards()) {
    const todo = boardTodos(board).find((item) => item.id === todoId);
    if (todo) return { todo, updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0 };
  }
  return undefined;
}

/**
 * The optimistic move on the cached boards (SPR-5): a board that has the todo moves it (or lets
 * it go, when it leaves the sprint); the target sprint's board takes it in, using `incoming` as
 * the todo when it wasn't on that board yet. Returns the target sprint's board after the move.
 */
export function moveInCachedBoards(todoId: string, incoming: Todo, target: MoveTarget): SprintBoardResponse | undefined {
  updateCachedBoards((todos, board) => {
    const has = todos.some((todo) => todo.id === todoId);
    if (!has && target.sprintId !== board.sprint.id) return todos;
    return applyMove(has ? todos : [...todos, incoming], todoId, target);
  });
  return target.sprintId ? queryClient.getQueryData<SprintBoardResponse>(qk.board(target.sprintId)) : undefined;
}
