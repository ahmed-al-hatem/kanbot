import type { Messages } from '@/i18n';
import { errorMessage } from '@/i18n/errors';

/**
 * An AI request's failure in the UI language (AI-5): 502 AI_ERROR and 429 RATE_LIMITED through
 * `errors.server` (English shows the server's own message, Arabic the code's meaning), the
 * client's NETWORK_ERROR / TIMEOUT through `errors.byCode`, and a generic line for anything else.
 * The copy itself (disclaimer, titles, hints) lives in `t.ai`.
 */
export function aiErrorMessage(error: unknown, t: Messages): string {
  return errorMessage(error, t);
}
