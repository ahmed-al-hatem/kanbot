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
