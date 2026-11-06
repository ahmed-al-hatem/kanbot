import type { ClientRect, KeyboardCoordinateGetter } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { describe, expect, it } from 'vitest';
import { edgeScrollStep, inlineStep } from './sensors';

/**
 * RTL (R5): ← / → step through lists in the direction the arrow points. Board columns run
 * right to left in Arabic, so → is the previous column and ← the next one.
 */
describe('inlineStep (board ← / →)', () => {
  it.each([
    ['ltr', 'ArrowRight', 1],
    ['ltr', 'ArrowLeft', -1],
    ['rtl', 'ArrowLeft', 1],
    ['rtl', 'ArrowRight', -1],
    ['rtl', 'ArrowUp', 0],
    ['ltr', 'Enter', 0],
  ] as const)('%s: %s → %i', (dir, key, step) => {
    expect(inlineStep(key, dir)).toBe(step);
  });
});

const rect = (left: number, top = 0, width = 100, height = 40): ClientRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

/**
 * Three lists side by side as an Arabic page draws them: the next one (in reading order) on the
 * left at x=0, the dragged item's list at x=200, the previous one on the right at x=400.
 */
function dragContext() {
  const entry = (id: string) => ({
    id,
    key: id,
    disabled: false,
    node: { current: document.createElement('div') },
    rect: { current: null },
    data: { current: {} },
  });
  const entries = [entry('next'), entry('active'), entry('previous')];
  const rects = new Map([
    ['next', rect(0)],
    ['active', rect(200)],
    ['previous', rect(400)],
  ]);
  return {
    active: { id: 'active' },
    collisionRect: rect(200),
    droppableRects: rects,
    droppableContainers: {
      getEnabled: () => entries,
      get: (id: string) => entries.find((item) => item.id === id),
    },
    over: null,
    scrollableAncestors: [],
  };
}

/** The coordinate getter `useDragSensors` gives dnd-kit's keyboard sensor. */
const move = (code: string) =>
  sortableKeyboardCoordinates(
    new KeyboardEvent('keydown', { code, key: code }),
    // Only the fields the getter reads; dnd-kit's full sensor context isn't needed.
    {
      active: 'active',
      currentCoordinates: { x: 200, y: 0 },
      context: dragContext(),
    } as unknown as Parameters<KeyboardCoordinateGetter>[1],
  );

describe('keyboard drag coordinates in RTL (useDragSensors)', () => {
  // The getter works from the measured rects, so it is visual in both directions by itself:
  // with the lists laid out right to left, ← reaches the next one without any mirroring.
  it('← goes to the list drawn on the left — the next one; → to the previous', () => {
    expect(move('ArrowLeft')).toEqual({ x: 0, y: 0 });
    expect(move('ArrowRight')).toEqual({ x: 400, y: 0 });
  });
});

describe('edgeScrollStep (RTL board auto-scroll)', () => {
  const board = rect(0, 0, 1000, 600);

  it('scrolls left near the left edge and right near the right edge, faster at the edge', () => {
    expect(edgeScrollStep(rect(150, 100, 200), board)).toBeLessThan(0);
    expect(edgeScrollStep(rect(0, 100, 200), board)).toBe(-10);
    expect(edgeScrollStep(rect(700, 100, 200), board)).toBeGreaterThan(0);
    expect(edgeScrollStep(rect(900, 100, 200), board)).toBe(10);
  });

  it('stays still in the middle', () => {
    expect(edgeScrollStep(rect(400, 100, 200), board)).toBe(0);
  });
});
