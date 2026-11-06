import type { Messages } from '@/i18n';
import type { ProjectSection } from '@/routeChunks';

/**
 * Requirements §9 "Keyboard shortcuts": what the help dialog lists, in its order. The keys are
 * the same in every language; `describe` reads the description from the messages.
 */
export const SHORTCUTS: readonly { keys: readonly string[]; describe: (t: Messages) => string }[] = [
  { keys: ['c'], describe: (t) => t.shell.shortcuts.create },
  { keys: ['/'], describe: (t) => t.shell.shortcuts.search },
  { keys: ['g', 'b'], describe: (t) => t.shell.shortcuts.goBoard },
  { keys: ['g', 'k'], describe: (t) => t.shell.shortcuts.goBacklog },
  { keys: ['g', 's'], describe: (t) => t.shell.shortcuts.goSprints },
  { keys: ['?'], describe: (t) => t.shell.shortcuts.help },
];

/** The second key after `g`. */
export const GO_KEYS: Readonly<Record<string, ProjectSection>> = { b: 'board', k: 'backlog', s: 'sprints' };

/** How long `g` waits for its second key. */
export const SEQUENCE_MS = 1500;

/** The elements the shortcuts act on; pages mark them with `data-shortcut`. */
export const CREATE_TARGET = '[data-shortcut="create"]';
export const SEARCH_TARGET = '[data-shortcut="search"]';

/** Typing in a field (or a widget that takes letters) never triggers a shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(target.type);
  }
  return target.closest('[role="textbox"], [role="combobox"], [role="searchbox"]') !== null;
}

/** A dialog, the drawer or a menu is open: its own keys (typeahead, Esc…) come first. */
export function overlayOpen(): boolean {
  return document.querySelector('[aria-modal="true"], [role="menu"], [role="alertdialog"]') !== null;
}

/**
 * Calls `found` with the first element matching `selector`, now or once it appears (a page
 * still loading its data), giving up after `timeoutMs`.
 */
export function whenPresent(selector: string, found: (element: HTMLElement) => void, timeoutMs = 3000) {
  const existing = document.querySelector<HTMLElement>(selector);
  if (existing) {
    found(existing);
    return;
  }
  const observer = new MutationObserver(() => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) return;
    stop();
    found(element);
  });
  const timer = setTimeout(stop, timeoutMs);
  function stop() {
    observer.disconnect();
    clearTimeout(timer);
  }
  observer.observe(document.body, { childList: true, subtree: true });
}

/** Inputs get focus; buttons (the board's "Create todo") are pressed. */
export function activate(element: HTMLElement) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    element.select();
  } else {
    element.click();
  }
}
