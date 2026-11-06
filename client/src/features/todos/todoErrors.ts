import type { Messages } from '@/i18n';
import { failureReason } from '@/i18n/errors';

/**
 * A todo request's failure in the UI language, for "Couldn't save KAN-12. …": a 404 says the
 * todo is gone (deleted meanwhile, e.g. in another tab) instead of the generic not-found text.
 */
export function todoErrorMessage(error: unknown, t: Messages): string {
  return failureReason(error, t, { NOT_FOUND: t.todos.notFound });
}
