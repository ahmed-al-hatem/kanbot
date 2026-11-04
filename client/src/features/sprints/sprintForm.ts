import { z } from 'zod';
import { addDays, daysBetween, formatRange, plural, todayIso } from '@/lib/format';
import type { Sprint } from '@/types/api';

/** API limits (server `sprints.routes.ts`): name 1–80, goal ≤ 300 (plan §2 #12). */
export const SPRINT_NAME_MAX = 80;
export const SPRINT_GOAL_MAX = 300;
/** Two weeks: the create default (DESIGN §9 13) and the start default (SPR-3, the server's +14). */
export const SPRINT_LENGTH_DAYS = 14;

export const END_BEFORE_START = 'End date must be after start date';

/** `YYYY-MM-DD` or empty (no date). The server rejects an end before the start. */
function datesInOrder(values: { startDate: string; endDate: string }, ctx: z.RefinementCtx) {
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: END_BEFORE_START });
  }
}

export const sprintFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Give the sprint a name')
      .max(SPRINT_NAME_MAX, `Keep the name under ${SPRINT_NAME_MAX} characters`),
    goal: z.string().trim().max(SPRINT_GOAL_MAX, `Keep the goal under ${SPRINT_GOAL_MAX} characters`),
    startDate: z.string(),
    endDate: z.string(),
  })
  .superRefine(datesInOrder);

export type SprintFormValues = z.infer<typeof sprintFormSchema>;

/** Start sprint: both dates required (SPR-3 defaults today and +14). */
export const startSprintSchema = z
  .object({
    startDate: z.string().min(1, 'Pick a start date'),
    endDate: z.string().min(1, 'Pick an end date'),
  })
  .superRefine(datesInOrder);

export type StartSprintValues = z.infer<typeof startSprintSchema>;

/**
 * "Sprint N" (SPR-1): one more than the highest "Sprint <n>" so far, and never less than the
 * count + 1. The server numbers from its own counter, so the client sends the name it shows.
 */
export function nextSprintName(sprints: readonly Pick<Sprint, 'name'>[]): string {
  const numbers = sprints.map((sprint) => /^Sprint (\d+)$/i.exec(sprint.name.trim())?.[1]).map(Number);
  const highest = Math.max(0, ...numbers.filter((value) => Number.isFinite(value)));
  return `Sprint ${Math.max(highest, sprints.length) + 1}`;
}

/** DESIGN §9 13: the day after the last sprint ends (any status), else today. */
export function defaultSprintStart(sprints: readonly Pick<Sprint, 'endDate'>[], today = todayIso()): string {
  const ends = sprints.map((sprint) => sprint.endDate).filter((end): end is string => Boolean(end));
  if (ends.length === 0) return today;
  return addDays(ends.reduce((last, end) => (end > last ? end : last)), 1);
}

export function createDefaults(sprints: readonly Sprint[], today = todayIso()): SprintFormValues {
  const startDate = defaultSprintStart(sprints, today);
  return { name: nextSprintName(sprints), goal: '', startDate, endDate: addDays(startDate, SPRINT_LENGTH_DAYS) };
}

export function editDefaults(sprint: Sprint): SprintFormValues {
  return { name: sprint.name, goal: sprint.goal, startDate: sprint.startDate ?? '', endDate: sprint.endDate ?? '' };
}

/**
 * The hint under the dates (DESIGN §9 13): "2 weeks · Nov 16 – Nov 30", "10 days · …",
 * "Starts and ends on Nov 16"; null when they are out of order (the error shows instead).
 */
export function durationHint(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return startDate || endDate ? 'Add both dates to see the length' : 'Dates are optional';
  const days = daysBetween(startDate, endDate);
  if (days < 0) return null;
  const range = formatRange(startDate, endDate) ?? '';
  if (days === 0) return `One day · ${range}`;
  const length = days % 7 === 0 ? plural(days / 7, 'week') : plural(days, 'day');
  return `${length} · ${range}`;
}
