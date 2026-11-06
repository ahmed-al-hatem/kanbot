import { useLayoutEffect } from 'react';

export const APP_NAME = 'Kanbot';

/** "Backlog · Kanbot Web · Kanbot": the most specific part first, empty parts skipped. */
export function titleOf(...parts: (string | null | undefined | false)[]): string {
  return [...parts.filter((part): part is string => Boolean(part)), APP_NAME].join(' · ');
}

/**
 * Who sets `document.title`. A page sets level 0; a dialog-backed route (`?todo=`) sets level 1
 * on top of it, and the page's title comes back when the dialog closes. Within a level the most
 * recent registration wins. React 19's `<title>` isn't used because two of them at once (page +
 * dialog) leave the winner to mount order.
 */
interface Entry {
  title: string;
  level: number;
  order: number;
}

const entries = new Map<symbol, Entry>();
let counter = 0;

function apply() {
  let winner: Entry | undefined;
  for (const entry of entries.values()) {
    if (
      !winner ||
      entry.level > winner.level ||
      (entry.level === winner.level && entry.order > winner.order)
    ) {
      winner = entry;
    }
  }
  document.title = winner?.title ?? APP_NAME;
}

/**
 * Sets `document.title` while the component is mounted (DESIGN §9: "Page not found · Kanbot").
 * `null` sets nothing, e.g. a dialog that stays mounted while it animates out.
 */
export function useDocumentTitle(title: string | null, level = 0) {
  // Layout effect: the title changes in the same commit as the page, never a frame later.
  useLayoutEffect(() => {
    if (title === null) return;
    const id = Symbol('title');
    entries.set(id, { title, level, order: counter++ });
    apply();
    return () => {
      entries.delete(id);
      apply();
    };
  }, [title, level]);
}
