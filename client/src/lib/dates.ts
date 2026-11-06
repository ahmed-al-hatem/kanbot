/**
 * Date arithmetic on date-only `YYYY-MM-DD` values (no formatting, no locale): moved out of
 * lib/format.ts when formatting moved to i18n/format.ts (RTL & Arabic, PR R1).
 */

export const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` → UTC midnight in ms, so date-only values never shift with the time zone. */
export function dayValue(isoDate: string): number {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Today in the user's time zone as `YYYY-MM-DD`. */
export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Whole days from `from` to `to` (both `YYYY-MM-DD`); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayValue(to) - dayValue(from)) / MS_PER_DAY);
}

/** `YYYY-MM-DD` plus `days` (negative goes back), without time-zone drift. */
export function addDays(isoDate: string, days: number): string {
  return new Date(dayValue(isoDate) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Days a due date has passed, or 0 when it hasn't (DESIGN §9 06 "Overdue by N days"). */
export function overdueDays(dueDate: string | null, today = todayIso()): number {
  if (!dueDate) return 0;
  return Math.max(0, daysBetween(dueDate, today));
}

/** "Day 3 of 14" numbers for a sprint with both dates, today clamped into it; null without dates. */
export function sprintDay(
  start: string | null,
  end: string | null,
  today = todayIso(),
): { day: number; total: number } | null {
  if (!start || !end) return null;
  const total = daysBetween(start, end) + 1;
  if (total < 1) return null;
  return { day: Math.min(Math.max(daysBetween(start, today) + 1, 1), total), total };
}
