import { TODO_STATUSES, type SprintBoardResponse, type SprintStats, type Todo, type TodoStatus } from '@/types/api';
import { compareTodos } from './moveInLists';

/**
 * The board cache (`GET /sprints/:id/todos`) as one flat list and back, so the optimistic
 * updates of the backlog (`applyMove`, temporary rows, removals) work on it unchanged.
 */

/** The board's todos, column after column, each column in `order`. */
export function boardTodos(board: SprintBoardResponse): Todo[] {
  return TODO_STATUSES.flatMap((status) => board.columns[status]);
}

/** The server's `statsFor`: Done-only points (plan §2 #10); a todo without points counts 0. */
export function sprintStatsOf(todos: readonly Todo[]): SprintStats {
  const byStatus = Object.fromEntries(TODO_STATUSES.map((status) => [status, 0])) as Record<TodoStatus, number>;
  let totalPoints = 0;
  let donePoints = 0;
  for (const todo of todos) {
    byStatus[todo.status] += 1;
    totalPoints += todo.storyPoints ?? 0;
    if (todo.status === 'done') donePoints += todo.storyPoints ?? 0;
  }
  return { totalTodos: todos.length, doneTodos: byStatus.done, totalPoints, donePoints, byStatus };
}

/**
 * The board rebuilt from a flat list: only this sprint's todos, by status column in the
 * server's order, with the sprint's live stats recomputed (so the header progress follows
 * an optimistic move at once). A column that didn't change keeps its array identity.
 */
export function withBoardTodos(board: SprintBoardResponse, todos: readonly Todo[]): SprintBoardResponse {
  const mine = todos.filter((todo) => todo.sprintId === board.sprint.id).sort(compareTodos);
  const columns = {} as Record<TodoStatus, Todo[]>;
  for (const status of TODO_STATUSES) {
    const next = mine.filter((todo) => todo.status === status);
    const previous = board.columns[status];
    const same = next.length === previous.length && next.every((todo, index) => todo === previous[index]);
    columns[status] = same ? previous : next;
  }
  return { sprint: { ...board.sprint, stats: sprintStatsOf(mine) }, columns };
}

/** Story points of a list (null = 0). */
export function pointsOf(todos: readonly Todo[]): number {
  return todos.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0);
}
