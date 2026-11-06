/*
 * IBM Plex Sans Arabic, self-hosted, the four weights the design uses. Imported here, in the
 * lazily loaded Arabic chunk, so English visitors never download the font or these messages.
 * Each weight's CSS has `unicode-range` subsets (arabic, latin…); the browser fetches only those
 * a page uses. Arabic uses this one family for Arabic and Latin text (plan §11).
 */
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import { plural, type PluralForms } from '../plural';
import type { Messages } from './en';

/**
 * Arabic messages. Terms follow docs/I18N-GLOSSARY.md (بند، سبرنت، نقاط القصة…); digits stay Latin.
 * Arabic has six plural forms: zero, one, two, few (3–10), many (11–99), other (100+).
 */
const count = (n: number, forms: PluralForms) => plural('ar', n, forms);

const fields: Readonly<Record<string, string>> = {};

export const ar = {
  language: {
    label: 'اللغة',
    change: (languageName: string) => `${languageName} — تغيير اللغة`,
    loadFailed: (languageName: string) =>
      `تعذّر تحميل ${languageName}. تحقّق من اتصالك وحاول مجددًا.`,
  },

  count: {
    todos: (n: number) =>
      count(n, {
        zero: 'لا بنود',
        one: 'بند واحد',
        two: 'بندان',
        few: `${n} بنود`,
        many: `${n} بندًا`,
        other: `${n} بند`,
      }),
    points: (n: number) =>
      count(n, {
        zero: 'لا نقاط',
        one: 'نقطة واحدة',
        two: 'نقطتان',
        few: `${n} نقاط`,
        many: `${n} نقطة`,
        other: `${n} نقطة`,
      }),
    days: (n: number) =>
      count(n, {
        zero: 'لا أيام',
        one: 'يوم واحد',
        two: 'يومان',
        few: `${n} أيام`,
        many: `${n} يومًا`,
        other: `${n} يوم`,
      }),
  },

  dates: {
    range: (start: string, end: string) => `${start} – ${end}`,
    from: (start: string) => `من ${start}`,
    until: (end: string) => `حتى ${end}`,
  },

  time: {
    justNow: 'الآن',
    minutesAgo: (n: number) =>
      count(n, {
        zero: 'الآن',
        one: 'منذ دقيقة',
        two: 'منذ دقيقتين',
        few: `منذ ${n} دقائق`,
        many: `منذ ${n} دقيقة`,
        other: `منذ ${n} دقيقة`,
      }),
    hoursAgo: (n: number) =>
      count(n, {
        zero: 'الآن',
        one: 'منذ ساعة',
        two: 'منذ ساعتين',
        few: `منذ ${n} ساعات`,
        many: `منذ ${n} ساعة`,
        other: `منذ ${n} ساعة`,
      }),
    daysAgo: (n: number) =>
      count(n, {
        zero: 'اليوم',
        one: 'منذ يوم',
        two: 'منذ يومين',
        few: `منذ ${n} أيام`,
        many: `منذ ${n} يومًا`,
        other: `منذ ${n} يوم`,
      }),
    daysLeft: (n: number) =>
      count(n, {
        zero: 'ينتهي اليوم',
        one: 'بقي يوم واحد',
        two: 'بقي يومان',
        few: `بقيت ${n} أيام`,
        many: `بقي ${n} يومًا`,
        other: `بقي ${n} يوم`,
      }),
    endsToday: 'ينتهي اليوم',
    endedDaysAgo: (n: number) =>
      count(n, {
        zero: 'انتهى اليوم',
        one: 'انتهى منذ يوم',
        two: 'انتهى منذ يومين',
        few: `انتهى منذ ${n} أيام`,
        many: `انتهى منذ ${n} يومًا`,
        other: `انتهى منذ ${n} يوم`,
      }),
  },

  summary: {
    todosAndPoints: (todos: string, points: string) => `${todos} · ${points}`,
  },

  errors: {
    generic: 'حدث خطأ ما. حاول مجددًا.',
    byCode: {
      NETWORK_ERROR: 'تعذّر الوصول إلى الخادم. هل هو قيد التشغيل؟',
      TIMEOUT: 'استغرق الخادم وقتًا طويلًا للرد. حاول مجددًا.',
    },
    fields,
  },
} satisfies Messages;
