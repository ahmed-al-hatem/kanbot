import { firstConnected, neighbourFocus } from '@/lib/refocus';

/**
 * Rows (and later board cards) mark their title button with `data-todo-focus="<id>"`, so
 * focus can be put back on a todo after a re-render, or on its neighbour after a delete.
 */
const ATTRIBUTE = 'data-todo-focus';

export const todoFocusSelector = (todoId: string) => `[${ATTRIBUTE}="${todoId}"]`;

/** After deleting a todo: the next one, the previous one, the quick-create input, the page title. */
export function todoNeighbourFocus(todoId: string): () => HTMLElement | null {
  return neighbourFocus(ATTRIBUTE, todoId, ['[data-quick-create]', '.page-title']);
}

/** The todo itself (it may have moved group and remounted), else the page title. */
export function todoOrPageFocus(todoId: string): () => HTMLElement | null {
  return () => firstConnected([todoFocusSelector(todoId), '.page-title']);
}
