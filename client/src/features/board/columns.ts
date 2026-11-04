import { STATUS_LABELS } from '@/features/todos/todoMeta';
import { pointsOf } from '@/lib/board';
import { TODO_STATUSES, type SprintBoardResponse, type Todo, type TodoStatus } from '@/types/api';

/** One board column (SPR-4): a status, its cards in `order`, and their total points. */
export interface BoardColumn {
  id: TodoStatus;
  name: string;
  todos: readonly Todo[];
  points: number;
}

/** The four columns in display order (To Do → Done), straight from the board cache. */
export function columnsOf(board: SprintBoardResponse): BoardColumn[] {
  return TODO_STATUSES.map((status) => ({
    id: status,
    name: STATUS_LABELS[status],
    todos: board.columns[status],
    points: pointsOf(board.columns[status]),
  }));
}
