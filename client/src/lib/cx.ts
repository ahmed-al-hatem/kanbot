/**
 * Joins class names, skipping falsy values. CSS Module lookups are `string | undefined`
 * under `noUncheckedIndexedAccess`, so they can be passed straight in.
 */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
