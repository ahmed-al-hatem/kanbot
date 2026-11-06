import { Fragment } from 'react';

/** Key caps as printed on the keyboard; the same in every language (the Arabic canvas keeps them Latin). */
const KEYS = {
  enter: 'Enter',
  esc: 'Esc',
  backspace: 'Backspace',
  comma: ',',
  up: '↑',
  down: '↓',
} as const;

type KeyName = keyof typeof KEYS;

const isKey = (name: string): name is KeyName => Object.hasOwn(KEYS, name);

interface KeyHintProps {
  /** A message with `{enter}`, `{esc}`, `{backspace}`, `{comma}`, `{up}`, `{down}` where the keys go. */
  text: string;
}

/**
 * A hint with keyboard keys inside it ("<kbd>Enter</kbd> to add"). The message keeps the keys
 * as tokens, so each language puts them where its sentence needs them; an unknown token shows its name.
 */
export function KeyHint({ text }: KeyHintProps) {
  const parts = text.split(/\{(\w+)\}/);
  return (
    <>
      {parts.map((part, index) => {
        // `split` with a capture group puts the token names at the odd indexes.
        if (index % 2 === 1) {
          return isKey(part) ? <kbd key={index}>{KEYS[part]}</kbd> : <Fragment key={index}>{part}</Fragment>;
        }
        return part && <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
