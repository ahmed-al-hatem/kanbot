import { isTodoPriority, isTodoType } from '@/features/todos/todoMeta';
import type { Todo, TodoPriority, TodoType } from '@/types/api';

/** BL-6 filters, kept in the URL (`?q=&priority=&type=`, plan §5.2) so they survive reload and can be shared. */
export interface BacklogFilters {
  q: string;
  priority: TodoPriority | null;
  type: TodoType | null;
}

/** Unknown values in a hand-edited URL are ignored rather than matching nothing. */
export function readFilters(params: URLSearchParams): BacklogFilters {
  const priority = params.get('priority');
  const type = params.get('type');
  return {
    q: params.get('q') ?? '',
    priority: isTodoPriority(priority) ? priority : null,
    type: isTodoType(type) ? type : null,
  };
}

export function writeFilters(params: URLSearchParams, patch: Partial<BacklogFilters>): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [name, value] of Object.entries(patch)) {
    if (value) next.set(name, value);
    else next.delete(name);
  }
  return next;
}

export function isFiltering({ q, priority, type }: BacklogFilters): boolean {
  return q.trim() !== '' || priority !== null || type !== null;
}

/**
 * Same fields as the server's `search` (key, title, description, labels; case-insensitive),
 * run over the cached list so typing sends no requests.
 */
export function matchesFilters(todo: Todo, { q, priority, type }: BacklogFilters): boolean {
  if (priority && todo.priority !== priority) return false;
  if (type && todo.type !== type) return false;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [todo.key, todo.title, todo.description, ...todo.labels].some((field) => field.toLowerCase().includes(needle));
}
