/**
 * Clean-up for text written by the model. The server lists todos for the model as
 * `KAN-22 [id:<uuid>]` (server/src/ai/assistant.service.ts), and a real model echoes that, so
 * internal ids can reach an answer. The server is the contract and can't change, so every AI
 * text is cleaned before it is shown or copied.
 */

const INTERNAL_ID = /\s*\[id:[^\]]*\]/g;
/** A todo key: the project key (2–6 letters, `^[A-Z]{2,6}$` in the API) and a number. */
const TODO_KEY = /\b[A-Z]{2,6}-\d+\b/g;
/** Code spans and fenced blocks: keys inside them stay plain text. */
const CODE = /(```[\s\S]*?```|`[^`\n]*`)/;

/** Removes `[id:…]` markers (and the space before them). */
export function stripInternalIds(text: string): string {
  return text.replace(INTERNAL_ID, '');
}

/** Every distinct todo key the text mentions, in order. */
export function todoKeysIn(text: string): string[] {
  return [...new Set(text.match(TODO_KEY) ?? [])];
}

/** The `href` of a todo link inside AI Markdown; `Markdown` turns it into an in-app link. */
export const TODO_HREF_PREFIX = '#todo=';

/**
 * Turns the keys of this project's todos (those in `keyToId`) into Markdown links, outside code
 * and outside existing link text. Unknown keys stay plain text.
 */
export function linkTodoKeys(markdown: string, keyToId: ReadonlyMap<string, string>): string {
  if (keyToId.size === 0) return markdown;
  return markdown
    .split(CODE)
    .map((part, index) =>
      // `split` with a capture group puts the code parts at odd indexes.
      index % 2 === 1
        ? part
        : part.replace(TODO_KEY, (key: string, offset: number, whole: string) => {
            const id = keyToId.get(key);
            const inLinkText = whole[offset - 1] === '[' || whole[offset + key.length] === ']';
            return id && !inLinkText
              ? `[${key}](${TODO_HREF_PREFIX}${encodeURIComponent(id)})`
              : key;
          }),
    )
    .join('');
}
