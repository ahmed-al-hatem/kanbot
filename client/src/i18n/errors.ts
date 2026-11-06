import { isApiError, type ApiErrorCode, type FieldIssue } from '@/api/errors';
import type { Messages } from './messages/en';

/**
 * Turns an `ApiError` into text in the current locale (R2: auth, the shell and projects; R3: the
 * backlog, Todo details and the sprint dialogs; R4 adopts it as its strings move).
 *
 * - Codes the client produces (`NETWORK_ERROR`, `TIMEOUT`) have their own message per locale.
 * - Server codes go through `errors.server[code](serverMessage)`: English shows the server's text
 *   as it came (it is English and "safe to show in the UI" per the API contract), Arabic says the
 *   code's meaning — never the raw English text.
 * - Anything that isn't an ApiError gets `errors.generic`.
 *
 * Screens with a more precise message for a status (login 401, register 409, project 409) check
 * it before calling this, or pass `byCode`: a sharper message per server code for this request,
 * given the server's text like `errors.server` (Start sprint's 409, a todo's or sprint's 404).
 */
export function errorMessage(error: unknown, t: Messages, byCode: ServerMessages = {}): string {
  if (!isApiError(error)) return t.errors.generic;
  return codeMessage(error.code, error.message, t, byCode);
}

/**
 * The reason after "Couldn't move KAN-12. …" in a toast: the error's message as above, or
 * "Please try again." when it isn't an ApiError (a bug, not a failed request).
 */
export function failureReason(error: unknown, t: Messages, byCode: ServerMessages = {}): string {
  return isApiError(error) ? errorMessage(error, t, byCode) : t.common.pleaseTryAgain;
}

/** Per-code messages that replace `errors.server` for one request. */
export type ServerMessages = Partial<Record<ServerErrorCode, (serverMessage: string) => string>>;

type ServerErrorCode = Exclude<ApiErrorCode, 'NETWORK_ERROR' | 'TIMEOUT'>;

function codeMessage(code: ApiErrorCode, serverMessage: string, t: Messages, byCode: ServerMessages): string {
  if (code === 'NETWORK_ERROR' || code === 'TIMEOUT') return t.errors.byCode[code];
  return (byCode[code] ?? t.errors.server[code])(serverMessage);
}

/** The top-level field of a `details[].path`: `labels.3` → `labels`. */
function fieldOf(path: string): string {
  return path.split('.')[0] ?? path;
}

/**
 * One `details[]` issue as text: through `errors.fields[field]` when the field is listed, else
 * `errors.field` — English keeps the server's text, Arabic a message for the field.
 */
export function fieldIssueMessage(issue: FieldIssue, t: Messages): string {
  const describe = t.errors.fields[fieldOf(issue.path)] ?? t.errors.field;
  return describe(issue.message);
}

/** `{ field: message }` for a VALIDATION_ERROR, first issue per field (like api/errors fieldErrors). */
export function fieldErrorMessages(error: unknown, t: Messages): Record<string, string> {
  if (!isApiError(error)) return {};
  const result: Record<string, string> = {};
  for (const issue of error.details) {
    const field = fieldOf(issue.path);
    if (field && !(field in result)) result[field] = fieldIssueMessage(issue, t);
  }
  return result;
}
