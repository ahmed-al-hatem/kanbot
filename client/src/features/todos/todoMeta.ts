import type { IconName } from '@/components/Icon/Icon';
import { en } from '@/i18n/messages/en';
import type { StoryPoints, TodoPriority, TodoStatus, TodoType } from '@/types/api';

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

/**
 * English names for the screens not migrated yet (board, AI dialogs, sprint history: R4), read
 * from the English dictionary. Migrated screens use `t.todos.*`; these go when R4 lands.
 */
export const TYPE_LABELS: Readonly<Record<TodoType, string>> = en.todos.type;
export const PRIORITY_LABELS: Readonly<Record<TodoPriority, string>> = en.todos.priority;
export const STATUS_LABELS: Readonly<Record<TodoStatus, string>> = en.todos.status;

/** Fibonacci values from the API (plan §2 #2); "None" is `null`. */
export const POINT_OPTIONS: readonly StoryPoints[] = [1, 2, 3, 5, 8, 13];

export function isTodoType(value: string | null): value is TodoType {
  return value !== null && (TYPE_OPTIONS as readonly string[]).includes(value);
}

export function isTodoPriority(value: string | null): value is TodoPriority {
  return value !== null && (PRIORITY_OPTIONS as readonly string[]).includes(value);
}
