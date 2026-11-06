/**
 * Bidirectional isolation for user and server text inside a sentence (RTL & Arabic, plan §11).
 *
 * A project, sprint or todo name, a key (KAN-12), an email or a server message keeps its own
 * direction inside an Arabic sentence only when it is isolated: without it, «Sprint 3 (نشط)» or
 * «KAN-12 نُقل إلى Done» can come out with the parentheses, digits or words in the wrong order.
 *
 * Dictionary functions return strings, so they mark a value with FSI … PDI (U+2068 / U+2069),
 * the plain-text form of `<bdi>`: browsers isolate it wherever the string is shown — text,
 * `<option>`, `title`, `document.title`. `BidiText` (components/BidiText) renders the same marks
 * as real `<bdi>` elements; the announcer strips them, since a screen reader has no layout.
 */

/** FIRST STRONG ISOLATE: the text inside takes the direction of its first strong letter. */
export const FSI = '\u2068';
/** POP DIRECTIONAL ISOLATE: ends the isolate. */
export const PDI = '\u2069';

/**
 * `value` isolated in a sentence. Empty values stay empty; an already isolated value isn't wrapped
 * twice. A number is accepted too (the dictionary shape test calls every message with numbers).
 */
export function isolate(value: string | number): string {
  const text = String(value);
  if (text === '' || (text.startsWith(FSI) && text.endsWith(PDI))) return text;
  return `${FSI}${text}${PDI}`;
}

const MARKS = new RegExp(`[${FSI}${PDI}]`, 'g');

/** The text without its isolation marks (screen-reader announcements, comparisons). */
export function stripIsolates(text: string): string {
  return text.replace(MARKS, '');
}

/** A piece of a marked string: plain text, or an isolate with its own (possibly nested) pieces. */
export type BidiPart = string | { isolate: BidiPart[] };

/**
 * Splits a marked string into plain text and isolates, nested as marked. An unmatched PDI is
 * dropped; an unclosed FSI isolates the rest of the string (what a browser does too).
 */
export function bidiParts(text: string): BidiPart[] {
  const root: BidiPart[] = [];
  const stack: BidiPart[][] = [root];
  let plain = '';
  const flush = () => {
    if (plain) stack[stack.length - 1]?.push(plain);
    plain = '';
  };
  for (const char of text) {
    if (char === FSI) {
      flush();
      const inner: BidiPart[] = [];
      stack[stack.length - 1]?.push({ isolate: inner });
      stack.push(inner);
    } else if (char === PDI) {
      flush();
      if (stack.length > 1) stack.pop();
    } else {
      plain += char;
    }
  }
  flush();
  return root;
}
