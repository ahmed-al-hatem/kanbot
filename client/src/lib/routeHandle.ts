import type { UIMatch } from 'react-router';

/** `handle` of the catch-all route, so the private guard can show a 404 to a signed-out visitor. */
export const NOT_FOUND_HANDLE = { notFound: true } as const;

export function isNotFoundMatch(matches: readonly UIMatch[]): boolean {
  return matches.some((match) => match.handle === NOT_FOUND_HANDLE);
}
