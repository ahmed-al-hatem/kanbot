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

/** Data on every backlog droppable: a row, or a whole group (its section, for empty or collapsed groups). */
export interface DropData {
  type: 'row' | 'group';
  groupId: string;
}

export const groupDropId = (groupId: string) => `group:${groupId}`;

/** Elements inside a row that must never start a drag (the ⋯ menu trigger). */
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
 * Pointer (4px before a drag starts, so clicks on the title still open it), touch (long press,
 * 200ms — DESIGN §13) and keyboard (Space / Enter on the drag handle, then the arrows).
 */
export function useBacklogSensors() {
  return useSensors(
    useSensor(MousePointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(LongPressTouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

const isRow = (container: DroppableContainer | undefined) =>
  (container?.data.current as DropData | undefined)?.type === 'row';

/**
 * Pointer: the row under the pointer, else the group under it (empty or collapsed groups).
 * Keyboard (no pointer): the closest row, so the arrows step from row to row.
 */
export const backlogCollisions: CollisionDetection = (args) => {
  if (args.pointerCoordinates) {
    const within = pointerWithin(args);
    const rows = within.filter((collision) => isRow(args.droppableContainers.find((c) => c.id === collision.id)));
    if (rows.length > 0) return rows;
    if (within.length > 0) return within;
  }
  const rowContainers = args.droppableContainers.filter(isRow);
  return closestCenter(rowContainers.length > 0 ? { ...args, droppableContainers: rowContainers } : args);
};
