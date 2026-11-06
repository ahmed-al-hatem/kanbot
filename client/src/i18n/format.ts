import { dayValue, daysBetween, MS_PER_DAY, todayIso } from '@/lib/dates';
import { intlTag, type Locale } from './config';
import type { Messages } from './messages/en';

/**
 * Every date, time and number the UI shows goes through a `Formatter` (DESIGN §12 content rules).
 * Get one with `useFormat()` in components; `createFormatter()` is for code outside React.
 *
 * English output is exactly what lib/format.ts always produced ("Nov 2", "Oct 20 – Nov 2",
 * "Nov 2, 2026", "Nov 4, 2026, 3:42 PM", "3 hours ago"). Arabic uses `ar-SY-u-nu-latn`:
 * Levantine months ("2 تشرين الثاني") with Latin digits.
 *
 * Ranges join two formatted days with the locale's `dates.range` message instead of
 * `Intl.DateTimeFormat#formatRange`: ICU's formatRange shortens same-month ranges ("Oct 20 – 25"),
 * adds years across a new year and uses thin spaces, which would change the English output.
 * Relative times come from messages too: `Intl.RelativeTimeFormat` says "2 min. ago" / "in 0 days",
 * not the design's wording.
 */
export interface Formatter {
  readonly locale: Locale;
  /** "Nov 2" for a `YYYY-MM-DD` date (no time-zone shift). */
  day: (isoDate: string) => string;
  /** "Oct 20 – Nov 2"; "From Oct 20" / "Until Nov 2" when one side is missing; null with neither. */
  range: (start: string | null, end: string | null) => string | null;
  /** "Nov 2, 2026" for a full ISO timestamp, in the user's time zone. */
  timestamp: (iso: string) => string;
  /** "Nov 4, 2026, 3:42 PM" for a full ISO timestamp, in the user's time zone. */
  dateTime: (iso: string) => string;
  /** Locale-aware number ("12,345.5"); Arabic keeps Latin digits. */
  number: (value: number) => string;
  /** "just now", "2 min ago", "3 hours ago", "4 days ago". */
  timeAgo: (iso: string, now?: number) => string;
  /** "5 days left", "Ends today", "Ended 2 days ago" — to a sprint's end date (SPR-4). */
  daysRemaining: (endDate: string | null, today?: string) => string | null;
  /** "5 todos · 13 pts" (BL-1). */
  todosAndPoints: (todos: number, points: number) => string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

interface IntlSet {
  shortDate: Intl.DateTimeFormat;
  fullDate: Intl.DateTimeFormat;
  dateTime: Intl.DateTimeFormat;
  number: Intl.NumberFormat;
}

const intlCache = new Map<Locale, IntlSet>();

function intlFor(locale: Locale): IntlSet {
  let set = intlCache.get(locale);
  if (!set) {
    const tag = intlTag(locale);
    set = {
      // UTC: the value is a date-only day at UTC midnight (dayValue).
      shortDate: new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      fullDate: new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric', year: 'numeric' }),
      dateTime: new Intl.DateTimeFormat(tag, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      number: new Intl.NumberFormat(tag),
    };
    intlCache.set(locale, set);
  }
  return set;
}

export function createFormatter(locale: Locale, t: Messages): Formatter {
  const intl = intlFor(locale);
  const day = (isoDate: string) => intl.shortDate.format(dayValue(isoDate));

  return {
    locale,
    day,
    range(start, end) {
      if (start && end) return t.dates.range(day(start), day(end));
      if (start) return t.dates.from(day(start));
      if (end) return t.dates.until(day(end));
      return null;
    },
    timestamp: (iso) => intl.fullDate.format(new Date(iso)),
    dateTime: (iso) => intl.dateTime.format(new Date(iso)),
    number: (value) => intl.number.format(value),
    timeAgo(iso, now = Date.now()) {
      const elapsed = now - new Date(iso).getTime();
      // Under a minute, or a little in the future (clock skew with the server).
      if (elapsed < MINUTE) return t.time.justNow;
      if (elapsed < HOUR) return t.time.minutesAgo(Math.floor(elapsed / MINUTE));
      if (elapsed < MS_PER_DAY) return t.time.hoursAgo(Math.floor(elapsed / HOUR));
      return t.time.daysAgo(Math.floor(elapsed / MS_PER_DAY));
    },
    daysRemaining(endDate, today = todayIso()) {
      if (!endDate) return null;
      const days = daysBetween(today, endDate);
      if (days > 0) return t.time.daysLeft(days);
      if (days === 0) return t.time.endsToday;
      return t.time.endedDaysAgo(-days);
    },
    todosAndPoints: (todos, points) =>
      t.summary.todosAndPoints(t.count.todos(todos), t.count.points(points)),
  };
}
