import { useEffect, useRef } from 'react';
import type {
  FieldErrors,
  FieldValues,
  Path,
  UseFormSetError,
  UseFormTrigger,
} from 'react-hook-form';
import { isApiError, type FieldIssue } from '@/api/errors';
import { getT, useLocale, type Messages } from '@/i18n';
import { fieldIssueMessage } from '@/i18n/errors';
import { announce } from '@/stores/announcer';

/** A message that can be written again in another language. */
export type Describe = (t: Messages) => string;

/** `setError` for server errors whose text follows the language (see useLocalizedErrors). */
export type SetServerError<T extends FieldValues> = (
  field: Path<T>,
  describe: Describe,
  options?: { shouldFocus: boolean },
) => void;

/** The first `details[]` issue of each top-level field (`labels.3` belongs under Labels). */
function issuesByField(error: unknown): Map<string, FieldIssue> {
  const byField = new Map<string, FieldIssue>();
  if (!isApiError(error)) return byField;
  for (const issue of error.details) {
    const field = issue.path.split('.')[0] ?? issue.path;
    if (field && !byField.has(field)) byField.set(field, issue);
  }
  return byField;
}

function applyIssues<T extends FieldValues>(
  error: unknown,
  fields: readonly Path<T>[],
  set: (field: Path<T>, issue: FieldIssue, shouldFocus: boolean) => void,
): boolean {
  const byField = issuesByField(error);
  const matched = fields.filter((field) => byField.has(field));
  matched.forEach((field, index) => {
    const issue = byField.get(field);
    if (issue) set(field, issue, index === 0);
  });
  if (matched.length > 0) announceInvalid(matched.length);
  return matched.length > 0;
}

/**
 * Puts server validation `details[]` under the matching fields (AUTH-1) and focuses the first
 * one, in the current language (i18n/errors.ts). Returns false when none of the details belong
 * to `fields`, so the caller can show the message somewhere else (a banner).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  return applyIssues(error, fields, (field, issue, shouldFocus) => {
    setError(field, { type: 'server', message: fieldIssueMessage(issue, getT()) }, { shouldFocus });
  });
}

/** `applyServerErrors` for forms using `useLocalizedErrors`: the messages follow a language switch. */
export function applyLocalizedServerErrors<T extends FieldValues>(
  error: unknown,
  setServerError: SetServerError<T>,
  fields: readonly Path<T>[],
): boolean {
  return applyIssues(error, fields, (field, issue, shouldFocus) => {
    setServerError(field, (t) => fieldIssueMessage(issue, t), { shouldFocus });
  });
}

export function announceInvalid(count: number) {
  announce(getT().common.fieldsNeedAttention(count));
}

/**
 * `handleSubmit`'s invalid callback: the validation summary for screen readers (DESIGN §10.4).
 * react-hook-form already focuses the first invalid field (`shouldFocusError`).
 */
export function onInvalidSubmit<T extends FieldValues>(errors: FieldErrors<T>) {
  announceInvalid(Object.keys(errors).length);
}

interface LocalizedErrorsOptions<T extends FieldValues> {
  errors: FieldErrors<T>;
  setError: UseFormSetError<T>;
  trigger: UseFormTrigger<T>;
}

/**
 * Keeps the errors a form is showing in the UI language. The form's zod schema is built from
 * `t` (one per locale), so after a switch every field showing a client error is validated again
 * and gets its message in the new language; server errors set through `setServerError` are
 * written again from what they describe. Values, touched state and focus don't change.
 */
export function useLocalizedErrors<T extends FieldValues>({
  errors,
  setError,
  trigger,
}: LocalizedErrorsOptions<T>): SetServerError<T> {
  const locale = useLocale();
  const shownIn = useRef(locale);
  const serverErrors = useRef(new Map<string, Describe>());

  useEffect(() => {
    if (shownIn.current === locale) return;
    shownIn.current = locale;
    const t = getT();
    const revalidate: Path<T>[] = [];
    const shown = errors as Readonly<Record<string, { type?: unknown } | undefined>>;
    for (const [name, fieldError] of Object.entries(shown)) {
      const field = name as Path<T>;
      const describe = serverErrors.current.get(name);
      if (fieldError?.type === 'server' && describe) {
        setError(field, { type: 'server', message: describe(t) });
      } else {
        revalidate.push(field);
      }
    }
    if (revalidate.length > 0) void trigger(revalidate);
  }, [locale, errors, setError, trigger]);

  return (field, describe, options) => {
    serverErrors.current.set(field, describe);
    setError(field, { type: 'server', message: describe(getT()) }, options);
  };
}
