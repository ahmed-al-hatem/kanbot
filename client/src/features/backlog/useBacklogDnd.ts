import type { Announcements, DragEndEvent, DragOverEvent, DragStartEvent, ScreenReaderInstructions } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useRef, useState } from 'react';
import type { BacklogGroup } from '@/hooks/useBacklog';
import { moveInLists, type Lists } from '@/lib/moveInLists';
import type { Todo } from '@/types/api';
import { backlogCollisions, useBacklogSensors, type DropData } from './dnd';

interface DragState {
  todo: Todo;
  fromGroup: string;
  fromIndex: number;
  /** The rows of every group while dragging: the todo moves between groups as it is dragged over them. */
  lists: Lists<Todo>;
  overGroup: string | null;
  /** Set on drop: the preview stays until the cache has the move (no flash of the old order). */
  droppedOn: readonly BacklogGroup[] | null;
}

/** Called on a drop that changes something: `index` is the todo's index in `rows` (the group's rows after the drop). */
export type DropHandler = (todo: Todo, group: BacklogGroup, index: number, rows: readonly Todo[]) => void;

const containerOf = (lists: Lists<Todo>, todoId: unknown) =>
  Object.keys(lists).find((key) => lists[key]?.some((todo) => todo.id === todoId));

const dropData = (data: unknown) => data as DropData | undefined;

export const SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    'To pick up a todo, press Space or Enter. Use the up and down arrow keys to move it, Space or Enter to drop it, Escape to cancel.',
};

/**
 * Drag and drop state for the Backlog (BL-5, BL-7; plan §3.5): reorder inside a group, and move
 * between groups — the dragged todo joins a group's preview as soon as it is over it (dnd-kit's
 * multiple-containers pattern, built on `moveInLists`). The drop reports the final index; the
 * page turns it into the server's `position` and moves the todo optimistically.
 */
export function useBacklogDnd(groups: readonly BacklogGroup[] | undefined, onDrop: DropHandler) {
  const sensors = useBacklogSensors();
  const [drag, setDragState] = useState<DragState | null>(null);
  // dnd-kit can fire dragEnd before the render that follows dragOver; the ref is always current.
  const latest = useRef<DragState | null>(null);
  const setDrag = (next: DragState | null) => {
    latest.current = next;
    setDragState(next);
  };

  const groupName = (groupId: string | undefined) => groups?.find((group) => group.id === groupId)?.name ?? 'the backlog';
  const keyOf = (id: unknown) => groups?.flatMap((group) => group.todos).find((todo) => todo.id === id)?.key ?? 'Todo';

  const onDragStart = ({ active }: DragStartEvent) => {
    if (!groups) return;
    const lists: Lists<Todo> = Object.fromEntries(groups.map((group) => [group.id, group.todos]));
    const fromGroup = containerOf(lists, active.id);
    const fromIndex = fromGroup ? (lists[fromGroup] ?? []).findIndex((todo) => todo.id === active.id) : -1;
    const todo = fromGroup ? lists[fromGroup]?.[fromIndex] : undefined;
    if (!fromGroup || !todo) return;
    setDrag({ todo, fromGroup, fromIndex, lists, overGroup: fromGroup, droppedOn: null });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const current = latest.current;
    const data = dropData(over?.data.current);
    if (!current || !over || !data) return;
    const from = containerOf(current.lists, active.id);
    let lists = current.lists;
    if (from && from !== data.groupId) {
      const target = lists[data.groupId] ?? [];
      let index = target.length;
      if (data.type === 'row') {
        const overIndex = target.findIndex((todo) => todo.id === over.id);
        const dragged = active.rect.current.translated;
        const below = dragged ? dragged.top > over.rect.top + over.rect.height / 2 : false;
        if (overIndex >= 0) index = overIndex + (below ? 1 : 0);
      }
      lists = moveInLists(lists, String(active.id), data.groupId, index);
    }
    if (lists !== current.lists || current.overGroup !== data.groupId) {
      setDrag({ ...current, lists, overGroup: data.groupId });
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = latest.current;
    if (!current || !groups) {
      setDrag(null);
      return;
    }
    const container = containerOf(current.lists, active.id);
    const group = groups.find((item) => item.id === container);
    let rows = container ? (current.lists[container] ?? []) : [];
    const data = dropData(over?.data.current);
    if (data?.type === 'row' && data.groupId === container && over && over.id !== active.id) {
      const oldIndex = rows.findIndex((todo) => todo.id === active.id);
      const newIndex = rows.findIndex((todo) => todo.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) rows = arrayMove([...rows], oldIndex, newIndex);
    }
    const index = rows.findIndex((todo) => todo.id === active.id);
    const unchanged =
      container === current.fromGroup && (index === current.fromIndex || group?.kind === 'active');
    if (!over || !group || index < 0 || unchanged) {
      setDrag(null);
      return;
    }
    setDrag({ ...current, lists: { ...current.lists, [group.id]: rows }, overGroup: null, droppedOn: groups });
    onDrop(current.todo, group, index, rows);
  };

  const onDragCancel = () => {
    setDrag(null);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${keyOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${keyOf(active.id)} is over ${groupName(dropData(over.data.current)?.groupId)}.` : undefined,
    // The move itself is announced by the page ("KAN-21 moved to Sprint 3, position 2 of 5").
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) => `Move cancelled. ${keyOf(active.id)} is back where it was.`,
  };

  // Dragging, or dropped and the cache doesn't have the move yet.
  const preview = drag && (drag.droppedOn === null || drag.droppedOn === groups) ? drag : null;

  return {
    contextProps: {
      sensors,
      collisionDetection: backlogCollisions,
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel,
      accessibility: { announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS },
    },
    /** The todo under the pointer (DragOverlay), only while dragging. */
    activeTodo: preview && !preview.droppedOn ? preview.todo : null,
    overGroup: preview && !preview.droppedOn ? preview.overGroup : null,
    /** The rows to show for a group while a drag is in progress, else undefined. */
    previewRows: (groupId: string) => preview?.lists[groupId],
  };
}
