/**
 * Runtime check that two dictionaries have the same shape: the same keys at every level, with a
 * string, a function or a nested section in the same places. `satisfies Messages` checks this at
 * compile time; this catches what types can't (a `Record<string, string>` map, a key added with a
 * cast) and runs in i18n.test.ts and, in development, whenever a locale loads.
 *
 * Returns the problems as dotted paths, e.g. `"time.daysLeft: missing"`; empty when they match.
 */
export function shapeDifferences(source: unknown, target: unknown, path = ''): string[] {
  const kind = (value: unknown) =>
    typeof value === 'function'
      ? 'function'
      : typeof value === 'string'
        ? 'string'
        : value && typeof value === 'object'
          ? 'section'
          : typeof value;

  if (kind(source) !== kind(target)) {
    return [`${path || '(root)'}: ${kind(source)} vs ${kind(target)}`];
  }
  if (kind(source) === 'string' && source === '') return [`${path}: empty`];
  if (kind(target) === 'string' && target === '') return [`${path}: empty`];
  if (kind(source) !== 'section') return [];

  const a = source as Record<string, unknown>;
  const b = target as Record<string, unknown>;
  const problems: string[] = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const child = path ? `${path}.${key}` : key;
    if (!(key in a)) problems.push(`${child}: extra`);
    else if (!(key in b)) problems.push(`${child}: missing`);
    else problems.push(...shapeDifferences(a[key], b[key], child));
  }
  return problems;
}
