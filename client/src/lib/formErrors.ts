import type { FieldErrors, FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { fieldErrors } from '@/api/errors';
import { announce } from '@/stores/announcer';

/**
 * Puts server validation `details[]` under the matching fields (AUTH-1) and focuses the first
 * one. Returns false when none of the details belong to `fields`, so the caller can show the
 * message somewhere else (a banner).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  const byField = fieldErrors(error);
  const matched = fields.filter((field) => field in byField);
  matched.forEach((field, index) => {
    setError(field, { type: 'server', message: byField[field] }, { shouldFocus: index === 0 });
  });
  if (matched.length > 0) announceInvalid(matched.length);
  return matched.length > 0;
}

function announceInvalid(count: number) {
  announce(count === 1 ? '1 field needs attention' : `${count} fields need attention`);
}

/**
 * `handleSubmit`'s invalid callback: the validation summary for screen readers (DESIGN §10.4).
 * react-hook-form already focuses the first invalid field (`shouldFocusError`).
 */
export function onInvalidSubmit<T extends FieldValues>(errors: FieldErrors<T>) {
  announceInvalid(Object.keys(errors).length);
}
