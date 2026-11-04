import type { IconName } from '@/components/Icon/Icon';
import type { StoryPoints, TodoPriority, TodoStatus, TodoType } from '@/types/api';

/** Display names and option order for the todo enums (plan §2 #1: four priorities, urgent first). */
export const TYPE_LABELS: Record<TodoType, string> = { story: 'Story', task: 'Task', bug: 'Bug' };
export const TYPE_OPTIONS: readonly TodoType[] = ['story', 'task', 'bug'];

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
export const PRIORITY_OPTIONS: readonly TodoPriority[] = ['urgent', 'high', 'medium', 'low'];

/** DESIGN §5.2 priority icons; `urgent` uses priority-highest in `--danger-icon` (plan §2 #1). */
export const PRIORITY_ICONS: Record<TodoPriority, IconName> = {
  urgent: 'priority-highest',
  high: 'priority-high',
  medium: 'priority-medium',
  low: 'priority-low',
};

export const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

/** Fibonacci values from the API (plan §2 #2); "None" is `null`. */
export const POINT_OPTIONS: readonly StoryPoints[] = [1, 2, 3, 5, 8, 13];

export function isTodoType(value: string | null): value is TodoType {
  return value !== null && Object.hasOwn(TYPE_LABELS, value);
}

export function isTodoPriority(value: string | null): value is TodoPriority {
  return value !== null && Object.hasOwn(PRIORITY_LABELS, value);
}
