import { z } from 'zod';
import type { Messages } from '@/i18n';
import { STORY_POINTS, TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES, type Todo, type UpdateTodoRequest } from '@/types/api';

/** `sprintId` value for the Backlog option of the Sprint select. */
export const BACKLOG_VALUE = 'backlog';

/** Select value for "None" in Story points; the others are the Fibonacci numbers as strings. */
export const NO_POINTS = '';
const POINT_VALUES = [NO_POINTS, ...STORY_POINTS.map(String)] as [string, ...string[]];

/** Server limits (plan §2 #12). */
export const TODO_TITLE_MAX = 200;
export const TODO_DESCRIPTION_MAX = 5000;
const LABEL_MAX = 30;
const LABELS_MAX = 10;

/**
 * Same limits as the server's update schema (plan §2 #12): title 1–200 (trimmed), description
 * ≤ 5000, up to 10 labels of ≤ 30 characters. Select values stay strings until `toUpdateRequest`.
 * Messages come from `t`, so the schema is built per language (see projects/projectSchema.ts).
 */
export function todoFormSchema(t: Messages) {
  const { validation } = t.todos;
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, validation.titleRequired)
      .max(TODO_TITLE_MAX, t.validation.maxChars(TODO_TITLE_MAX)),
    description: z.string().max(TODO_DESCRIPTION_MAX, t.validation.maxChars(TODO_DESCRIPTION_MAX)),
    type: z.enum(TODO_TYPES),
    status: z.enum(TODO_STATUSES),
    priority: z.enum(TODO_PRIORITIES),
    storyPoints: z.enum(POINT_VALUES),
    labels: z
      .array(z.string().trim().min(1).max(LABEL_MAX, validation.labelMax(LABEL_MAX)))
      .max(LABELS_MAX, validation.labelsMax(LABELS_MAX)),
    dueDate: z.string().refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), validation.dateInvalid),
    sprintId: z.string().min(1),
  });
}

export type TodoFormValues = z.infer<ReturnType<typeof todoFormSchema>>;

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
  if (changed.has('storyPoints')) body.storyPoints = pointsOf(values.storyPoints);
  if (changed.has('labels')) body.labels = values.labels;
  if (changed.has('dueDate')) body.dueDate = values.dueDate || null;
  if (changed.has('sprintId')) body.sprintId = values.sprintId === BACKLOG_VALUE ? null : values.sprintId;
  return body;
}

/** The select's value as the API's story points (`null`: not estimated). */
export function pointsOf(value: string): Todo['storyPoints'] {
  return STORY_POINTS.find((points) => String(points) === value) ?? null;
}
