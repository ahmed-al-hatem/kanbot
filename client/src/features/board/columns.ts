import type { Messages } from '@/i18n';
import { pointsOf } from '@/lib/board';
import { TODO_STATUSES, type SprintBoardResponse, type Todo, type TodoStatus } from '@/types/api';

/** One board column (SPR-4): a status, its cards in `order`, and their total points. */
export interface BoardColumn {
  id: TodoStatus;
  /** The status name in the UI language (`t.todos.status`). */
  name: string;
  todos: readonly Todo[];
  points: number;
}

/** The four columns in display order (To Do → Done), straight from the board cache. */
export function columnsOf(
  board: SprintBoardResponse,
  statusNames: Messages['todos']['status'],
): BoardColumn[] {
  return TODO_STATUSES.map((status) => ({
    id: status,
    name: statusNames[status],
    todos: board.columns[status],
    points: pointsOf(board.columns[status]),
  }));
}
