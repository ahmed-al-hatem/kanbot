/** Server rule (`projects.routes.ts` keySchema): 2–6 letters, stored uppercase. */
export const PROJECT_KEY_PATTERN = /^[A-Z]{2,6}$/;
export const PROJECT_KEY_MAX = 6;

/**
 * Mirror of the server's `keyFromName`: "Mobile App Redesign" → "MAR", "Kanbot" → "KAN".
 * Initials of up to four words, else the first three letters of the only word, else "PRJ".
 */
export function keyFromName(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const key =
    words.length > 1
      ? words
          .map((word) => word[0])
          .join('')
          .slice(0, 4)
      : (words[0] ?? '').slice(0, 3);
  return key.length >= 2 ? key : 'PRJ';
}

/**
 * The key the server will store for a new project created without one: the generated key,
 * or KANA, KANB… when the user already has it (same loop as `POST /projects`).
 */
export function generatedKey(name: string, takenKeys: readonly string[]): string {
  const base = keyFromName(name);
  const taken = new Set(takenKeys);
  let key = base;
  for (let i = 0; taken.has(key); i++) {
    key = (base + String.fromCharCode(65 + i)).slice(0, PROJECT_KEY_MAX);
  }
  return key;
}

/** What the key field holds as the user types: uppercase, no surrounding spaces. */
export function normalizeKey(value: string): string {
  return value.trim().toUpperCase();
}
