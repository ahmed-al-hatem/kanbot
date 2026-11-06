/**
 * English-only bridge for screens not yet migrated to i18n (RTL & Arabic, R1). Formatting now
 * lives in `i18n/format.ts` and date math in `lib/dates.ts`; these exports keep their old names
 * and exact English output so the 20-odd importers don't change in this PR. Each area switches to
 * `useFormat()` / `useT()` when its strings move (R2–R4), and this file is deleted in R5.
 */
import { createFormatter } from '@/i18n/format';
import { en } from '@/i18n/messages/en';

export { addDays, daysBetween, overdueDays, sprintDay, todayIso } from '@/lib/dates';

const english = createFormatter('en', en);

export const formatDay = english.day;
export const formatRange = english.range;
export const formatTimestamp = english.timestamp;
export const formatDateTime = english.dateTime;
export const timeAgo = english.timeAgo;
export const daysRemaining = english.daysRemaining;
export const todosAndPoints = english.todosAndPoints;

/** English-only "1 todo" / "3 todos"; migrated screens use `t.count.*` (Intl.PluralRules). */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
