import type { Messages } from '@/i18n';
import { titleOf } from '@/lib/documentTitle';
import type { NotFoundCause } from '@/stores/notFound';

/**
 * DESIGN §9 "Variants by cause": same layout, different h1 and body, from `t.notFound[cause]`.
 * Projects and todos are addressed by id (plan §2 #8), so the h1 can't name a key the way the
 * canvas does.
 */
export function notFoundCopy(t: Messages, cause: NotFoundCause): { title: string; body: string } {
  return t.notFound[cause];
}

/** DESIGN §9: `document.title` for every cause ("Page not found · Kanbot"). */
export function notFoundTitle(t: Messages): string {
  return titleOf(t.notFound.pageTitle);
}
