import type { IconName } from '@/components/Icon/Icon';
import type { StoryPoints, TodoPriority, TodoType } from '@/types/api';

/**
 * Option order for the todo enums (plan §2 #1: four priorities, urgent first). Their names come
 * from the dictionaries: `t.todos.type[type]`, `t.todos.priority[priority]`, `t.todos.status[status]`.
 */
export const TYPE_OPTIONS: readonly TodoType[] = ['story', 'task', 'bug'];
export const PRIORITY_OPTIONS: readonly TodoPriority[] = ['urgent', 'high', 'medium', 'low'];

/** DESIGN §5.2 priority icons; `urgent` uses priority-highest in `--danger-icon` (plan §2 #1). */
export const PRIORITY_ICONS: Record<TodoPriority, IconName> = {
  urgent: 'priority-highest',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

/** Fibonacci values from the API (plan §2 #2); "None" is `null`. */
export const POINT_OPTIONS: readonly StoryPoints[] = [1, 2, 3, 5, 8, 13];

export function isTodoType(value: string | null): value is TodoType {
  return value !== null && (TYPE_OPTIONS as readonly string[]).includes(value);
}

export function isTodoPriority(value: string | null): value is TodoPriority {
  return value !== null && (PRIORITY_OPTIONS as readonly string[]).includes(value);
}
