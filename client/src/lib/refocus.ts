/** How long after a delete we keep watching for focus to fall to `<body>`. */
const WATCH_MS = 3000;
const TICK_MS = 50;

/**
 * After deleting an item, the button that had focus (its ⋯ or title) leaves the DOM with it
 * and focus falls to `<body>`. Whichever comes last — the confirm dialog closing or the
 * optimistic removal — this moves focus to `resolve()` (the next item, else a sensible
 * fallback) once focus is lost. Focus the user put somewhere else on purpose is left alone.
 */
export function refocusAfterRemoval(resolve: () => HTMLElement | null) {
  const started = Date.now();
  let focused: HTMLElement | null = null;
  // Done only once focus is still on what we focused a tick later: a closing dialog's focus
  // trap can pull it back inside and then unmount, dropping it to `<body>` again.
  const tick = () => {
    const active = document.activeElement;
    if (focused && active === focused) return;
    if (!active || active === document.body) {
      focused = resolve();
      focused?.focus();
    }
    if (Date.now() - started < WATCH_MS) setTimeout(tick, TICK_MS);
  };
  setTimeout(tick, 0);
}

/**
 * The first element that is still in the document among `selectors`, e.g. the next row's
 * title, then the previous one, then the page's quick-create input.
 */
export function firstConnected(selectors: (string | null | undefined)[]): HTMLElement | null {
  for (const selector of selectors) {
    if (!selector) continue;
    const element = document.querySelector<HTMLElement>(selector);
    if (element) return element;
  }
  return null;
}

/**
 * Captures, **now** (before the item is removed), the items next to the one marked
 * `[attribute="id"]` and returns a resolver for `refocusAfterRemoval`: the next item, the
 * previous one, then `fallbacks` (selectors), e.g. the page title.
 */
export function neighbourFocus(attribute: string, id: string, fallbacks: string[]): () => HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[${attribute}]`));
  const index = all.findIndex((element) => element.getAttribute(attribute) === id);
  const neighbours = index < 0 ? [] : [all[index + 1], all[index - 1]];
  const selectors = neighbours.map((element) => {
    const value = element?.getAttribute(attribute);
    return value ? `[${attribute}="${value}"]` : null;
  });
  return () => firstConnected([...selectors, ...fallbacks]);
}
