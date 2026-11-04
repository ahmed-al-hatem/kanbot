import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DroppableContainer,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react';

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
        event.isPrimary && event.button === 0 && event.pointerType !== 'touch' && startsDrag(event.target),
    },
  ];
}

class LongPressTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent: event }: ReactTouchEvent) => event.touches.length === 1 && startsDrag(event.target),
    },
  ];
}

/**
 * Pointer (4px before a drag starts, so clicks still open the todo) and touch (long press,
 * 200ms — DESIGN §13). With `keyboard`, dnd-kit's keyboard sensor too (Space / Enter on a drag
 * handle, then the arrows): the Backlog has handles; the Board moves focused cards with its own
 * arrow keys instead, so Enter on a card keeps opening it.
 */
export function useDragSensors({ keyboard }: { keyboard: boolean }) {
  const pointer = useSensor(MousePointerSensor, { activationConstraint: { distance: 4 } });
  const touch = useSensor(LongPressTouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } });
  const keys = useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates });
  return useSensors(pointer, touch, ...(keyboard ? [keys] : []));
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
    const items = within.filter((collision) => isItem(args.droppableContainers.find((c) => c.id === collision.id)));
    if (items.length > 0) return items;
    if (within.length > 0) return within;
  }
  const itemContainers = args.droppableContainers.filter(isItem);
  return closestCenter(itemContainers.length > 0 ? { ...args, droppableContainers: itemContainers } : args);
};
