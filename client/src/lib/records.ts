/** A copy of `record` without `key` (no `delete` on a dynamic key). */
export function omitKey<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}
