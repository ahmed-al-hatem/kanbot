import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/errors';
import * as legacy from '@/lib/format';
import { intlTag, LOCALE_CONFIG, LOCALES } from './config';
import { errorMessage, fieldErrorMessages } from './errors';
import { createFormatter } from './format';
import { ar } from './messages/ar';
import { en, type Messages } from './messages/en';
import { LANGUAGE_NAMES } from './messages/languages';
import { shapeDifferences } from './parity';
import { pluralCategory } from './plural';

/** Every string in a dictionary, calling each function with sample arguments. */
function allStrings(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (typeof node === 'function') {
    const fn = node as (...args: unknown[]) => unknown;
    // Counts and formatted values: try a few numbers (all plural forms in both languages).
    return [0, 1, 2, 3, 11, 100].flatMap((n) =>
      allStrings(fn(...Array.from({ length: fn.length }, () => n)), `${path}(${n})`),
    );
  }
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) =>
      allStrings(value, path ? `${path}.${key}` : key),
    );
  }
  return [[path, String(node)]];
}

describe('dictionaries', () => {
  it('ar has exactly the keys of en (runtime parity check)', () => {
    expect(shapeDifferences(en, ar)).toEqual([]);
  });

  it('the parity check reports missing, extra and mismatched keys', () => {
    expect(shapeDifferences({ a: 'x', b: { c: 'y' } }, { b: { c: () => 'y' }, d: 'z' })).toEqual([
      'a: missing',
      'b.c: string vs function',
      'd: extra',
    ]);
  });

  it.each([
    ['en', en],
    ['ar', ar],
  ] as [string, Messages][])('%s has no empty strings, from keys or functions', (_name, messages) => {
    const empty = allStrings(messages).filter(([, value]) => value.trim() === '');
    expect(empty).toEqual([]);
  });

  it('names every locale in its own language', () => {
    for (const locale of LOCALES) {
      expect(LANGUAGE_NAMES[locale].name).not.toBe('');
      expect(LANGUAGE_NAMES[locale].short).not.toBe('');
    }
    expect(LANGUAGE_NAMES.ar.short).toBe('ع');
    expect(LANGUAGE_NAMES.en.short).toBe('EN');
  });
});

describe('config', () => {
  it('maps each locale to its direction and Intl tag', () => {
    expect(LOCALE_CONFIG.en).toEqual({ dir: 'ltr', intl: 'en-US' });
    expect(LOCALE_CONFIG.ar).toEqual({ dir: 'rtl', intl: 'ar-SY-u-nu-latn' });
  });
});

describe('plurals', () => {
  it('Arabic uses all six forms', () => {
    expect([0, 1, 2, 3, 11, 100].map((n) => pluralCategory('ar', n))).toEqual([
      'zero',
      'one',
      'two',
      'few',
      'many',
      'other',
    ]);
  });

  it('Arabic counts read each form', () => {
    expect([0, 1, 2, 3, 11, 100].map((n) => ar.count.todos(n))).toEqual([
      'لا بنود',
      'بند واحد',
      'بندان',
      '3 بنود',
      '11 بندًا',
      '100 بند',
    ]);
    expect(ar.count.points(5)).toBe('5 نقاط');
    expect(ar.time.daysLeft(2)).toBe('بقي يومان');
  });

  it('English keeps one / other', () => {
    expect([0, 1, 2].map((n) => en.count.todos(n))).toEqual(['0 todos', '1 todo', '2 todos']);
    expect([1, 13].map((n) => en.count.points(n))).toEqual(['1 pt', '13 pts']);
  });
});

describe('format — Arabic', () => {
  const format = createFormatter('ar', ar);

  it('ar-SY-u-nu-latn gives Levantine months with Latin digits', () => {
    const january = new Intl.DateTimeFormat(intlTag('ar'), { month: 'long', timeZone: 'UTC' });
    expect(january.format(Date.UTC(2026, 0, 5))).toBe('كانون الثاني');
    expect(format.day('2026-01-05')).toBe('5 كانون الثاني');
    expect(format.day('2026-11-02')).toBe('2 تشرين الثاني');
    expect(format.timestamp('2026-11-02T10:00:00')).toBe('2 تشرين الثاني 2026');
    expect(format.number(12345)).toBe('12,345');
    // No Arabic-Indic digits anywhere.
    expect(format.range('2026-10-20', '2026-11-02')).not.toMatch(/[٠-٩]/);
  });

  it('ranges, relative times and days left', () => {
    expect(format.range('2026-10-20', '2026-11-02')).toBe('20 تشرين الأول – 2 تشرين الثاني');
    expect(format.range('2026-10-20', null)).toBe('من 20 تشرين الأول');
    const now = Date.parse('2026-11-04T12:00:00Z');
    expect(format.timeAgo('2026-11-04T11:58:00Z', now)).toBe('منذ دقيقتين');
    expect(format.timeAgo('2026-11-04T09:00:00Z', now)).toBe('منذ 3 ساعات');
    expect(format.daysRemaining('2026-11-14', '2026-11-04')).toBe('بقيت 10 أيام');
    expect(format.todosAndPoints(2, 13)).toBe('بندان · 13 نقطة');
  });
});

describe('format — English output is unchanged', () => {
  const format = createFormatter('en', en);

  it('dates', () => {
    expect(format.day('2026-11-02')).toBe('Nov 2');
    expect(format.range('2026-10-20', '2026-11-02')).toBe('Oct 20 – Nov 2');
    // Same month: both sides in full (ICU formatRange would print "Oct 20 – 25").
    expect(format.range('2026-10-20', '2026-10-25')).toBe('Oct 20 – Oct 25');
    expect(format.range('2026-12-28', '2027-01-05')).toBe('Dec 28 – Jan 5');
    expect(format.range('2026-10-20', null)).toBe('From Oct 20');
    expect(format.range(null, '2026-11-02')).toBe('Until Nov 2');
    expect(format.range(null, null)).toBeNull();
    expect(format.timestamp('2026-11-02T10:00:00')).toBe('Nov 2, 2026');
    expect(format.dateTime('2026-11-04T15:42:00')).toBe('Nov 4, 2026, 3:42 PM');
  });

  it('relative time, days left, counts', () => {
    const now = Date.parse('2026-11-04T12:00:00Z');
    expect(format.timeAgo('2026-11-04T11:59:30Z', now)).toBe('just now');
    expect(format.timeAgo('2026-11-04T11:58:00Z', now)).toBe('2 min ago');
    expect(format.timeAgo('2026-11-04T11:00:00Z', now)).toBe('1 hour ago');
    expect(format.timeAgo('2026-11-04T09:00:00Z', now)).toBe('3 hours ago');
    expect(format.timeAgo('2026-11-01T12:00:00Z', now)).toBe('3 days ago');
    expect(format.daysRemaining('2026-11-05', '2026-11-04')).toBe('1 day left');
    expect(format.daysRemaining('2026-11-09', '2026-11-04')).toBe('5 days left');
    expect(format.daysRemaining('2026-11-04', '2026-11-04')).toBe('Ends today');
    expect(format.daysRemaining('2026-11-02', '2026-11-04')).toBe('Ended 2 days ago');
    expect(format.daysRemaining(null)).toBeNull();
    expect(format.todosAndPoints(1, 1)).toBe('1 todo · 1 pt');
    expect(format.todosAndPoints(5, 13)).toBe('5 todos · 13 pts');
  });

  it('lib/format.ts still exports the same English helpers', () => {
    expect(legacy.formatDay('2026-11-02')).toBe('Nov 2');
    expect(legacy.formatRange('2026-10-20', '2026-11-02')).toBe('Oct 20 – Nov 2');
    expect(legacy.todosAndPoints(5, 13)).toBe('5 todos · 13 pts');
    expect(legacy.plural(1, 'day')).toBe('1 day');
    expect(legacy.plural(3, 'day')).toBe('3 days');
    expect(legacy.addDays('2026-11-02', 14)).toBe('2026-11-16');
    expect(legacy.daysBetween('2026-11-02', '2026-11-16')).toBe(14);
  });
});

describe('errors', () => {
  it('client-side codes use the locale; server codes keep the server message', () => {
    const network = new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'x' });
    expect(errorMessage(network, en)).toBe('Cannot reach the server. Is it running?');
    expect(errorMessage(network, ar)).toBe(ar.errors.byCode.NETWORK_ERROR);

    const conflict = new ApiError({ status: 409, code: 'CONFLICT', message: 'This key is already used' });
    expect(errorMessage(conflict, ar)).toBe('This key is already used');
    expect(errorMessage(new Error('boom'), en)).toBe(en.errors.generic);
  });

  it('maps details[] to fields by top-level path, first issue wins', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      details: [
        { path: 'labels.3', message: 'Too long' },
        { path: 'labels.4', message: 'Also too long' },
        { path: 'title', message: 'Required' },
      ],
    });
    expect(fieldErrorMessages(error, en)).toEqual({ labels: 'Too long', title: 'Required' });
  });
});
