/**
 * English-only bridge from R1, **unused since R4**: every screen now formats through
 * `useFormat()` / `getFormat()` (`i18n/format.ts`) and does date math with `lib/dates.ts`.
 * Nothing imports this file any more; R5 deletes it. Don't add importers.
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
