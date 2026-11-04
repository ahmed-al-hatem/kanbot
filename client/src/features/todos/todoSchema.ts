import { z } from 'zod';
import { STORY_POINTS, TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES, type Todo, type UpdateTodoRequest } from '@/types/api';

/** `sprintId` value for the Backlog option of the Sprint select. */
export const BACKLOG_VALUE = 'backlog';

/** Select value for "None" in Story points; the others are the Fibonacci numbers as strings. */
export const NO_POINTS = '';
const POINT_VALUES = [NO_POINTS, ...STORY_POINTS.map(String)] as [string, ...string[]];

/**
 * Same limits as the server's update schema (plan §2 #12): title 1–200 (trimmed), description
 * ≤ 5000, up to 10 labels of ≤ 30 characters. Select values stay strings until `toUpdateRequest`.
 */
export const todoFormSchema = z.object({
  title: z.string().trim().min(1, 'A todo needs a title').max(200, 'Use 200 characters or fewer'),
  description: z.string().max(5000, 'Use 5000 characters or fewer'),
  type: z.enum(TODO_TYPES),
  status: z.enum(TODO_STATUSES),
  priority: z.enum(TODO_PRIORITIES),
  storyPoints: z.enum(POINT_VALUES),
  labels: z.array(z.string().trim().min(1).max(30, 'Labels can be 30 characters at most')).max(10, 'Use 10 labels or fewer'),
  dueDate: z.string().refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a valid date'),
  sprintId: z.string().min(1),
});

export type TodoFormValues = z.infer<typeof todoFormSchema>;

export function toFormValues(todo: Todo): TodoFormValues {
  return {
    title: todo.title,
    description: todo.description,
    type: todo.type,
    status: todo.status,
    priority: todo.priority,
    storyPoints: todo.storyPoints === null ? NO_POINTS : String(todo.storyPoints),
    labels: todo.labels,
    dueDate: todo.dueDate ?? '',
    sprintId: todo.sprintId ?? BACKLOG_VALUE,
  };
}

function sameValue(a: unknown, b: unknown) {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => item === b[i]);
  return a === b;
}

/** Fields whose value differs from the todo's (title compared trimmed, as the server stores it). */
export function changedFields(values: TodoFormValues, initial: TodoFormValues): (keyof TodoFormValues)[] {
  return (Object.keys(initial) as (keyof TodoFormValues)[]).filter((field) =>
    field === 'title'
      ? values.title.trim() !== initial.title
      : !sameValue(values[field], initial[field]),
  );
}

/** The PATCH body: only the fields the user changed (BL-3), in the API's shapes. */
export function toUpdateRequest(values: TodoFormValues, initial: TodoFormValues): UpdateTodoRequest {
  const changed = new Set(changedFields(values, initial));
  const body: UpdateTodoRequest = {};
  if (changed.has('title')) body.title = values.title.trim();
  if (changed.has('description')) body.description = values.description;
  if (changed.has('type')) body.type = values.type;
  if (changed.has('status')) body.status = values.status;
  if (changed.has('priority')) body.priority = values.priority;
  if (changed.has('storyPoints')) {
    body.storyPoints = STORY_POINTS.find((value) => String(value) === values.storyPoints) ?? null;
  }
  if (changed.has('labels')) body.labels = values.labels;
  if (changed.has('dueDate')) body.dueDate = values.dueDate || null;
  if (changed.has('sprintId')) body.sprintId = values.sprintId === BACKLOG_VALUE ? null : values.sprintId;
  return body;
}
