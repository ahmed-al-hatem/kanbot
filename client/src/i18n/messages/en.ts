import { plural } from '../plural';

/** Validation messages per field, filled as forms move (see `errors.fields`). */
const fields: Readonly<Record<string, string>> = {};

/**
 * English messages: the source of truth. `Messages` is derived from this object, so a key added
 * here must be added to ar.ts too (TypeScript fails otherwise, and i18n.test.ts checks it at
 * runtime). Read them as `t.section.key` or `t.section.fn(n)`, never by string key.
 *
 * Parameters and plurals are functions. Plurals go through `plural()` (Intl.PluralRules), never
 * `n === 1 ? … : …`, so Arabic can use all six forms.
 *
 * R1 holds only what the i18n foundation itself needs (formatting, the language switcher, error
 * fallbacks). Screen strings move here area by area in R2–R4; every English output stays the same.
 */
const count = (n: number, one: string, other: string) => plural('en', n, { one, other });

export const en = {
  language: {
    /** The switcher group (segmented control on auth pages). */
    label: 'Language',
    /** The sidebar item's accessible name, after the target language's own name. */
    change: (languageName: string) => `${languageName} — Change language`,
    /** Toast when the other language's chunk can't be downloaded (offline, a new deploy). */
    loadFailed: (languageName: string) =>
      `Couldn't load ${languageName}. Check your connection and try again.`,
  },

  count: {
    todos: (n: number) => count(n, `${n} todo`, `${n} todos`),
    /** Story points, short: "1 pt", "13 pts". */
    points: (n: number) => count(n, `${n} pt`, `${n} pts`),
    days: (n: number) => count(n, `${n} day`, `${n} days`),
  },

  dates: {
    /** Both days are already formatted ("Oct 20", "Nov 2"); an en dash between them (DESIGN §12). */
    range: (start: string, end: string) => `${start} – ${end}`,
    from: (start: string) => `From ${start}`,
    until: (end: string) => `Until ${end}`,
  },

  time: {
    justNow: 'just now',
    minutesAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => count(n, `${n} hour ago`, `${n} hours ago`),
    daysAgo: (n: number) => count(n, `${n} day ago`, `${n} days ago`),
    daysLeft: (n: number) => count(n, `${n} day left`, `${n} days left`),
    endsToday: 'Ends today',
    endedDaysAgo: (n: number) => count(n, `Ended ${n} day ago`, `Ended ${n} days ago`),
  },

  summary: {
    /** "5 todos · 13 pts" — the backlog header and group meta (BL-1). */
    todosAndPoints: (todos: string, points: string) => `${todos} · ${points}`,
  },

  errors: {
    generic: 'Something went wrong. Please try again.',
    /**
     * Messages for codes the client itself produces. Server codes show the server's message
     * (it's English; see README Known issues) unless a later PR maps them here.
     */
    byCode: {
      NETWORK_ERROR: 'Cannot reach the server. Is it running?',
      TIMEOUT: 'The server took too long to respond. Please try again.',
    },
    /**
     * Validation messages per `details[].path` (top-level field name). Empty until the forms move
     * in R2–R4: until then the server's message is shown under the field.
     */
    fields,
  },
};

/** Recursively widens string literals to `string`, keeping functions and object shapes. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T;

export type Messages = Widen<typeof en>;
