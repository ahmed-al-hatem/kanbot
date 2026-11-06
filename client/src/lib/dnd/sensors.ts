import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type AutoScrollOptions,
  type ClientRect,
  type CollisionDetection,
  type DroppableContainer,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  useMemo,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { useDirection, type Direction } from '@/i18n';

/**
 * Drag inputs and collision rules shared by the Backlog (groups of rows) and the Board (columns
 * of cards). A *list* is a backlog group or a board column; an *item* is a row or a card.
 */

/** Data on every droppable: an item (`row`), or a whole list (`group`, for empty or collapsed lists). */
export interface DropData {
  type: 'row' | 'group';
  groupId: string;
}

export const groupDropId = (groupId: string) => `group:${groupId}`;

/** Elements inside an item that must never start a drag (the ⋯ menu trigger). */
const NO_DRAG = '[data-no-drag]';

function startsDrag(target: EventTarget | null) {
  return !(target instanceof Element && target.closest(NO_DRAG));
}

/**
 * Mouse and pen only: a touch also fires `pointerdown`, and without this a finger scrolling the
 * page would start a drag after 4px. Touch goes through the long-press sensor below.
 */
class MousePointerSensor extends PointerSensor {
  static override activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: ReactPointerEvent) =>
        event.isPrimary &&
        event.button === 0 &&
        event.pointerType !== 'touch' &&
        startsDrag(event.target),
    },
  ];
}

class LongPressTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent: event }: ReactTouchEvent) =>
        event.touches.length === 1 && startsDrag(event.target),
    },
  ];
}

/**
 * ← / → as a step along the reading order of lists laid out in a row (board columns): −1 is the
 * previous list, +1 the next. In RTL the next column is the one on the *left*, so the keys swap —
 * the arrow always moves toward the column it points at (Arabic canvas). Other keys: 0.
 */
export function inlineStep(key: string, dir: Direction): -1 | 0 | 1 {
  const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
  const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
  return key === forward ? 1 : key === backward ? -1 : 0;
}

/**
 * Pointer (4px before a drag starts, so clicks still open the todo) and touch (long press,
 * 200ms — DESIGN §13). With `keyboard`, dnd-kit's keyboard sensor too (Space / Enter on a drag
 * handle, then the arrows): the Backlog has handles; the Board moves focused cards with its own
 * arrow keys instead, so Enter on a card keeps opening it.
 */
export function useDragSensors({ keyboard }: { keyboard: boolean }) {
  const pointer = useSensor(MousePointerSensor, { activationConstraint: { distance: 4 } });
  const touch = useSensor(LongPressTouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  // `sortableKeyboardCoordinates` picks the closest droppable *on screen* in the arrow's
  // direction, from the measured rects, so it is already visual in RTL (→ reaches the item drawn
  // on the right); it must not be mirrored again (`inlineStep` is for stepping by index).
  const keys = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
  return useSensors(pointer, touch, ...(keyboard ? [keys] : []));
}

/** Scrolls sideways only (the board's column strip), not up and down. */
const scrollsInlineOnly = (element: Element) =>
  element.scrollWidth > element.clientWidth && element.scrollHeight <= element.clientHeight;

/**
 * `autoScroll` for a `DndContext`. dnd-kit decides whether a container can still scroll left
 * from `scrollLeft <= 0`, which is always true in RTL (scrollLeft runs from 0 at the start, on
 * the right, down to −max): dragging a card toward the left edge of the board would never
 * scroll. So in RTL dnd-kit keeps the vertical containers and `HorizontalEdgeScroll` scrolls
 * the board strip. In LTR nothing changes.
 */
export function useDragAutoScroll(): AutoScrollOptions {
  const dir = useDirection();
  return useMemo<AutoScrollOptions>(
    () => (dir === 'rtl' ? { canScroll: (element) => !scrollsInlineOnly(element) } : {}),
    [dir],
  );
}

/** Share of the container's width, from each side, where a dragged item scrolls it (dnd-kit's 20%). */
const EDGE = 0.2;
/** Pixels per frame at the very edge (dnd-kit's acceleration). */
const MAX_STEP = 10;

/**
 * Pixels to scroll a horizontal container this frame while `dragged` is over it: negative
 * toward the left edge, positive toward the right, faster nearer the edge, 0 in the middle.
 * Physical on purpose — `scrollBy({ left })` moves the same way in LTR and RTL, so the
 * negative `scrollLeft` of RTL never enters the sum.
 */
export function edgeScrollStep(dragged: ClientRect, container: ClientRect): number {
  const zone = container.width * EDGE;
  if (zone <= 0) return 0;
  const intoLeft = container.left + zone - dragged.left;
  const intoRight = dragged.right - (container.right - zone);
  if (intoLeft > 0 && intoLeft >= intoRight) return -MAX_STEP * Math.min(1, intoLeft / zone);
  if (intoRight > 0) return MAX_STEP * Math.min(1, intoRight / zone);
  return 0;
}

const isItem = (container: DroppableContainer | undefined) =>
  (container?.data.current as DropData | undefined)?.type === 'row';

/**
 * Pointer: the item under the pointer, else the list under it (empty or collapsed lists).
 * Keyboard (no pointer): the closest item, so the arrows step from item to item.
 */
export const listCollisions: CollisionDetection = (args) => {
  if (args.pointerCoordinates) {
    const within = pointerWithin(args);
    const items = within.filter((collision) =>
      isItem(args.droppableContainers.find((c) => c.id === collision.id)),
    );
    if (items.length > 0) return items;
    if (within.length > 0) return within;
  }
  const itemContainers = args.droppableContainers.filter(isItem);
  return closestCenter(
    itemContainers.length > 0 ? { ...args, droppableContainers: itemContainers } : args,
  );
};
