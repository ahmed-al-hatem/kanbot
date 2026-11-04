import { TODO_STATUSES, type Todo, type TodoStatus } from '@/types/api';

/**
 * The drag-and-drop model of plan §3.5, as pure functions shared by the optimistic cache
 * update, the drag preview and the keyboard / menu moves.
 *
 * A *list* is the backlog of a project, or one status column of one sprint (the server's
 * `listOf`). `position` is always the index in the target list **after removing** the moved
 * item (0 = top), so the same number works for a reorder inside a list and a move between lists.
 */

export interface Identified {
  id: string;
}

export type Lists<T> = Readonly<Record<string, readonly T[]>>;

const clamp = (value: number, max: number) => Math.max(0, Math.min(Math.trunc(value), max));

/**
 * Moves `itemId` into `toList` at `position` (clamped to the list). Only the source and target
 * lists are new arrays; the others keep their identity. An unknown item or target list returns
 * `lists` unchanged.
 */
export function moveInLists<T extends Identified>(lists: Lists<T>, itemId: string, toList: string, position: number): Lists<T> {
  const fromList = Object.keys(lists).find((key) => lists[key]?.some((item) => item.id === itemId));
  if (fromList === undefined || !(toList in lists)) return lists;
  const source = lists[fromList] ?? [];
  const item = source.find((entry) => entry.id === itemId);
  if (!item) return lists;

  const next: Record<string, readonly T[]> = { ...lists, [fromList]: source.filter((entry) => entry.id !== itemId) };
  const target = [...(next[toList] ?? [])];
  target.splice(clamp(position, target.length), 0, item);
  next[toList] = target;
  return next;
}

/** Where a todo goes: `POST /todos/:id/move` minus the request shape. */
export interface MoveTarget {
  sprintId: string | null;
  status: TodoStatus;
  position: number;
}

const BACKLOG_LIST = 'backlog';
const STATUS_RANK = Object.fromEntries(TODO_STATUSES.map((status, index) => [status, index])) as Record<TodoStatus, number>;

/** The server's list for a todo: the backlog (status ignored), or `<sprintId>:<status>`. */
export function listKeyOf(todo: Pick<Todo, 'sprintId' | 'status'>): string {
  return todo.sprintId === null ? BACKLOG_LIST : `${todo.sprintId}:${todo.status}`;
}

/**
 * The order of `GET /projects/:id/todos`: grouped by sprint; inside a sprint by status column
 * (To Do → Done), then `order`; the backlog by `order`.
 */
export function compareTodos(a: Todo, b: Todo): number {
  if (a.sprintId !== b.sprintId) return (a.sprintId ?? '').localeCompare(b.sprintId ?? '');
  const byStatus = a.sprintId === null ? 0 : STATUS_RANK[a.status] - STATUS_RANK[b.status];
  return byStatus || a.order - b.order || a.createdAt.localeCompare(b.createdAt);
}

/**
 * The optimistic twin of the server's `moveTodo` over the project's flat todo list: take the
 * todo out of its list, insert it at `target.position` of the target list, renumber `order`
 * in both, and return the list in the server's order. An unknown id changes nothing.
 */
export function applyMove(todos: readonly Todo[], todoId: string, target: MoveTarget): Todo[] {
  const lists: Record<string, Todo[]> = {};
  for (const todo of [...todos].sort(compareTodos)) (lists[listKeyOf(todo)] ??= []).push(todo);
  const toKey = listKeyOf(target);
  lists[toKey] ??= [];
  const moved = moveInLists(lists, todoId, toKey, target.position);
  if (moved === lists) return [...todos].sort(compareTodos);

  const result: Todo[] = [];
  for (const [key, list] of Object.entries(moved)) {
    const renumber = list !== lists[key];
    list.forEach((todo, index) => {
      let next = todo;
      if (todo.id === todoId) {
        const completedAt =
          target.status === 'done' ? (todo.status === 'done' ? todo.completedAt : new Date().toISOString()) : null;
        next = { ...todo, sprintId: target.sprintId, status: target.status, completedAt };
      }
      if (renumber && next.order !== index) next = { ...next, order: index };
      result.push(next);
    });
  }
  return result.sort(compareTodos);
}

/** Where a todo sits now, as a target that would put it back there (rollback, Undo). */
export function currentPlace(todos: readonly Todo[], todoId: string): MoveTarget | undefined {
  const todo = todos.find((item) => item.id === todoId);
  if (!todo) return undefined;
  const key = listKeyOf(todo);
  const list = todos.filter((item) => listKeyOf(item) === key).sort(compareTodos);
  return { sprintId: todo.sprintId, status: todo.status, position: list.findIndex((item) => item.id === todoId) };
}

/**
 * The server target for dropping `todo` at `index` of a backlog group's rows (the index once the
 * todo itself is left out). In the backlog that index is the position. A sprint's rows are its
 * status columns one after another, and a move keeps the status, so the position counts only
 * the same-status todos above the drop point.
 */
export function dropTarget(groupTodos: readonly Todo[], todo: Todo, sprintId: string | null, index: number): MoveTarget {
  const rest = groupTodos.filter((item) => item.id !== todo.id);
  const at = clamp(index, rest.length);
  if (sprintId === null) return { sprintId, status: todo.status, position: at };
  const position = rest.slice(0, at).filter((item) => item.status === todo.status).length;
  return { sprintId, status: todo.status, position };
}
