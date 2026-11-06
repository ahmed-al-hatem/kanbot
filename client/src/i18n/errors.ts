import { isApiError, type ApiErrorCode, type FieldIssue } from '@/api/errors';
import type { Messages } from './messages/en';

/**
 * Skeleton (R1): turns an `ApiError` into text in the current locale. Areas adopt it as their
 * strings move (R2–R4); until then they keep showing `error.message` as before.
 *
 * - Codes the client produces (`NETWORK_ERROR`, `TIMEOUT`) have their own message per locale.
 * - Server codes show the server's message, which is English and "safe to show in the UI" per the
 *   API contract (README Known issues), until a code is added to `errors.byCode`.
 * - Anything that isn't an ApiError gets `errors.generic`.
 */
export function errorMessage(error: unknown, t: Messages): string {
  if (!isApiError(error)) return t.errors.generic;
  return codeMessage(error.code, t) ?? (error.message || t.errors.generic);
}

function codeMessage(code: ApiErrorCode, t: Messages): string | undefined {
  const byCode: Readonly<Partial<Record<ApiErrorCode, string>>> = t.errors.byCode;
  return byCode[code];
}

/**
 * One `details[]` issue as text: the message mapped for its top-level field (`labels.3` →
 * `labels`) when there is one, else the server's.
 */
export function fieldIssueMessage(issue: FieldIssue, t: Messages): string {
  const field = issue.path.split('.')[0] ?? issue.path;
  return t.errors.fields[field] ?? issue.message;
}

/** `{ field: message }` for a VALIDATION_ERROR, first issue per field (like api/errors fieldErrors). */
export function fieldErrorMessages(error: unknown, t: Messages): Record<string, string> {
  if (!isApiError(error)) return {};
  const result: Record<string, string> = {};
  for (const issue of error.details) {
    const field = issue.path.split('.')[0] ?? issue.path;
    if (field && !(field in result)) result[field] = fieldIssueMessage(issue, t);
  }
  return result;
}
