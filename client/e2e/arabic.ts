import type { Locator, Page } from '@playwright/test';
import { escapeRegExp } from './support';

/**
 * Arabic e2e (RTL & Arabic, PR R5): the `chromium-ar` project in playwright.config.ts opens every
 * page with Arabic saved (`kanbot.locale`), so these specs (`*.ar.spec.ts`) read the Arabic UI.
 * The texts are those of src/i18n/messages/ar.ts — copied, not imported: that module loads the
 * Arabic font's CSS, which Node can't import. Server data (names, mock AI replies) stays as the
 * server sends it.
 */

/** `t.count.todos(n)` in Arabic: zero, one, two, few (3–10), many (11–99), other (100+). */
export function arTodos(n: number): string {
  switch (new Intl.PluralRules('ar').select(n)) {
    case 'zero':
      return 'لا بنود';
    case 'one':
      return 'بند واحد';
    case 'two':
      return 'بندان';
    case 'few':
      return `${n} بنود`;
    case 'many':
      return `${n} بندًا`;
    default:
      return `${n} بند`;
  }
}

/** Board column names (`t.todos.status`). */
export const AR_STATUS = {
  todo: 'للتنفيذ',
  in_progress: 'قيد التنفيذ',
  in_review: 'قيد المراجعة',
  done: 'منجز',
} as const;

/** A board column by its Arabic name: its accessible name is «<name>، <count>». */
export const arColumn = (page: Page, name: string) =>
  page.getByRole('region', { name: new RegExp(`^${escapeRegExp(name)}، `) });

/** The sidebar (`t.shell.nav.label`). */
export const mainNav = (page: Page): Locator =>
  page.getByRole('navigation', { name: 'القائمة الرئيسية' });
