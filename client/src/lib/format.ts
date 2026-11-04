/** Formatting helpers shared by the backlog, todo details and (later) the board (DESIGN §12 content rules). */

const MS_PER_DAY = 86_400_000;

const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

/** `YYYY-MM-DD` → UTC midnight in ms, so date-only values never shift with the time zone. */
function dayValue(isoDate: string): number {
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

/** "Nov 2" for a `YYYY-MM-DD` date. */
export function formatDay(isoDate: string): string {
  return shortDate.format(dayValue(isoDate));
}

/** "Oct 20 – Nov 2" (en dash, DESIGN §12); one side alone when the other is missing. */
export function formatRange(start: string | null, end: string | null): string | null {
  if (start && end) return `${formatDay(start)} – ${formatDay(end)}`;
  if (start) return `From ${formatDay(start)}`;
  if (end) return `Until ${formatDay(end)}`;
  return null;
}

/** "Nov 2, 2026" for a full ISO timestamp, in the user's time zone. */
export function formatTimestamp(iso: string): string {
  return fullDate.format(new Date(iso));
}

/** Days a due date has passed, or 0 when it hasn't (DESIGN §9 06 "Overdue by N days"). */
export function overdueDays(dueDate: string | null, today = todayIso()): number {
  if (!dueDate) return 0;
  return Math.max(0, daysBetween(dueDate, today));
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "5 todos · 13 pts" — the backlog header and group meta (BL-1). */
export function todosAndPoints(count: number, points: number): string {
  return `${plural(count, 'todo')} · ${points} ${points === 1 ? 'pt' : 'pts'}`;
}

/** "5 days left", "Ends today", "Ended 2 days ago" — from today to a sprint's end date (SPR-4). */
export function daysRemaining(endDate: string | null, today = todayIso()): string | null {
  if (!endDate) return null;
  const days = daysBetween(today, endDate);
  if (days > 0) return `${plural(days, 'day')} left`;
  if (days === 0) return 'Ends today';
  return `Ended ${plural(-days, 'day')} ago`;
}

const dateTime = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "Nov 4, 2026, 3:42 PM" for a full ISO timestamp, in the user's time zone. */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** "just now", "2 min ago", "3 hours ago", "4 days ago" — how long before `now` an ISO timestamp is. */
export function timeAgo(iso: string, now = Date.now()): string {
  const elapsed = now - new Date(iso).getTime();
  // Under a minute, or a little in the future (clock skew with the server).
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < MS_PER_DAY) return `${plural(Math.floor(elapsed / HOUR), 'hour')} ago`;
  return `${plural(Math.floor(elapsed / MS_PER_DAY), 'day')} ago`;
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
