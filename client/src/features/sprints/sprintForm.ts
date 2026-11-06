import { z } from 'zod';
import type { Formatter, Messages } from '@/i18n';
import { addDays, daysBetween, todayIso } from '@/lib/dates';
import type { Sprint } from '@/types/api';

/** API limits (server `sprints.routes.ts`): name 1–80, goal ≤ 300 (plan §2 #12). */
export const SPRINT_NAME_MAX = 80;
export const SPRINT_GOAL_MAX = 300;
/** Two weeks: the create default (DESIGN §9 13) and the start default (SPR-3, the server's +14). */
export const SPRINT_LENGTH_DAYS = 14;

/** `YYYY-MM-DD` or empty (no date). The server rejects an end before the start. */
function datesInOrder(message: string) {
  return (values: { startDate: string; endDate: string }, ctx: z.RefinementCtx) => {
    if (values.startDate && values.endDate && values.endDate < values.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message });
    }
  };
}

/**
 * Create / edit sprint. Messages come from `t`, so the schema is built per language (see
 * projects/projectSchema.ts); the dialogs memoise it per locale.
 */
export function sprintFormSchema(t: Messages) {
  const { validation } = t.sprints;
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, validation.nameRequired)
        .max(SPRINT_NAME_MAX, validation.nameMax(SPRINT_NAME_MAX)),
      goal: z.string().trim().max(SPRINT_GOAL_MAX, validation.goalMax(SPRINT_GOAL_MAX)),
      startDate: z.string(),
      endDate: z.string(),
    })
    .superRefine(datesInOrder(validation.endBeforeStart));
}

export type SprintFormValues = z.infer<ReturnType<typeof sprintFormSchema>>;

/** Start sprint: both dates required (SPR-3 defaults today and +14). */
export function startSprintSchema(t: Messages) {
  const { validation } = t.sprints;
  return z
    .object({
      startDate: z.string().min(1, validation.startRequired),
      endDate: z.string().min(1, validation.endRequired),
    })
    .superRefine(datesInOrder(validation.endBeforeStart));
}

export type StartSprintValues = z.infer<ReturnType<typeof startSprintSchema>>;

/**
 * "Sprint N" (SPR-1): one more than the highest "Sprint <n>" so far, and never less than the
 * count + 1. The server numbers from its own counter, so the client sends the name it shows.
 * It is data, not UI text: the name is stored, and the Arabic UI keeps it as typed (glossary).
 */
export function nextSprintName(sprints: readonly Pick<Sprint, 'name'>[]): string {
  const numbers = sprints
    .map((sprint) => /^Sprint (\d+)$/i.exec(sprint.name.trim())?.[1])
    .map(Number);
  const highest = Math.max(0, ...numbers.filter((value) => Number.isFinite(value)));
  return `Sprint ${Math.max(highest, sprints.length) + 1}`;
}

/** DESIGN §9 13: the day after the last sprint ends (any status), else today. */
export function defaultSprintStart(
  sprints: readonly Pick<Sprint, 'endDate'>[],
  today = todayIso(),
): string {
  const ends = sprints.map((sprint) => sprint.endDate).filter((end): end is string => Boolean(end));
  if (ends.length === 0) return today;
  return addDays(
    ends.reduce((last, end) => (end > last ? end : last)),
    1,
  );
}

export function createDefaults(sprints: readonly Sprint[], today = todayIso()): SprintFormValues {
  const startDate = defaultSprintStart(sprints, today);
  return {
    name: nextSprintName(sprints),
    goal: '',
    startDate,
    endDate: addDays(startDate, SPRINT_LENGTH_DAYS),
  };
}

export function editDefaults(sprint: Sprint): SprintFormValues {
  return {
    name: sprint.name,
    goal: sprint.goal,
    startDate: sprint.startDate ?? '',
    endDate: sprint.endDate ?? '',
  };
}

/**
 * The hint under the dates (DESIGN §9 13): "2 weeks · Nov 16 – Nov 30", "10 days · …",
 * "One day · Nov 16 – Nov 16"; null when they are out of order (the error shows instead).
 */
export function durationHint(
  startDate: string,
  endDate: string,
  format: Formatter,
  t: Messages,
): string | null {
  const { duration } = t.sprints;
  if (!startDate || !endDate) return startDate || endDate ? duration.bothDates : duration.optional;
  const days = daysBetween(startDate, endDate);
  if (days < 0) return null;
  const range = format.range(startDate, endDate) ?? '';
  if (days === 0) return duration.oneDay(range);
  const length = days % 7 === 0 ? t.count.weeks(days / 7) : t.count.days(days);
  return duration.length(length, range);
}
