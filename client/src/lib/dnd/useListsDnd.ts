import type {
  Announcements,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  ScreenReaderInstructions,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useRef, useState } from 'react';
import { useT } from '@/i18n';
import { moveInLists, type Lists } from '@/lib/moveInLists';
import type { Todo } from '@/types/api';
import { listCollisions, type DropData, type useDragSensors } from './sensors';

/** A droppable list of todos: a backlog group or a board column. */
export interface DndList {
  id: string;
  /** Spoken while dragging: "KAN-21 is over In Progress." (already in the UI language). */
  name: string;
  todos: readonly Todo[];
}

interface DragState<L extends DndList> {
  todo: Todo;
  fromList: string;
  fromIndex: number;
  /** The items of every list while dragging: the todo moves between lists as it is dragged over them. */
  lists: Lists<Todo>;
  overList: string | null;
  /** Set on drop: the preview stays until the cache has the move (no flash of the old order). */
  droppedOn: readonly L[] | null;
}

/** Called on a drop that changes something: `index` is the todo's index in `rows` (the list's items after the drop). */
export type DropHandler<L extends DndList> = (todo: Todo, list: L, index: number, rows: readonly Todo[]) => void;

interface ListsDndOptions<L extends DndList> {
  sensors: ReturnType<typeof useDragSensors>;
  /** The page's own keyboard instructions, from its dictionary section. */
  instructions: ScreenReaderInstructions;
  /** A list whose items can't be reordered by dropping inside it (the backlog's active sprint). */
  reorderable?: (list: L) => boolean;
}

const containerOf = (lists: Lists<Todo>, todoId: unknown) =>
  Object.keys(lists).find((key) => lists[key]?.some((todo) => todo.id === todoId));

const dropData = (data: unknown) => data as DropData | undefined;

/**
 * Drag and drop state over several lists of todos (BL-5, BL-7, SPR-5; plan §3.5): reorder inside
 * a list, and move between lists — the dragged todo joins a list's preview as soon as it is over
 * it (dnd-kit's multiple-containers pattern, built on `moveInLists`). The drop reports the final
 * index; the page turns it into the server's `position` and moves the todo optimistically.
 * The announcements (pick up, over, cancel) come from `t.dnd`; the drop is announced by the page
 * with the list and position ("KAN-21 moved to Sprint 3, position 2 of 5").
 */
export function useListsDnd<L extends DndList>(
  lists: readonly L[] | undefined,
  onDrop: DropHandler<L>,
  { sensors, instructions, reorderable = () => true }: ListsDndOptions<L>,
) {
  const t = useT();
  const [drag, setDragState] = useState<DragState<L> | null>(null);
  // dnd-kit can fire dragEnd before the render that follows dragOver; the ref is always current.
  const latest = useRef<DragState<L> | null>(null);
  const setDrag = (next: DragState<L> | null) => {
    latest.current = next;
    setDragState(next);
  };

  const listName = (listId: string | undefined) =>
    lists?.find((list) => list.id === listId)?.name ?? t.dnd.fallbackList;
  const keyOf = (id: unknown) =>
    lists?.flatMap((list) => list.todos).find((todo) => todo.id === id)?.key ?? t.dnd.fallbackKey;

  const onDragStart = ({ active }: DragStartEvent) => {
    if (!lists) return;
    const items: Lists<Todo> = Object.fromEntries(lists.map((list) => [list.id, list.todos]));
    const fromList = containerOf(items, active.id);
    const fromIndex = fromList ? (items[fromList] ?? []).findIndex((todo) => todo.id === active.id) : -1;
    const todo = fromList ? items[fromList]?.[fromIndex] : undefined;
    if (!fromList || !todo) return;
    setDrag({ todo, fromList, fromIndex, lists: items, overList: fromList, droppedOn: null });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const current = latest.current;
    const data = dropData(over?.data.current);
    if (!current || !over || !data) return;
    const from = containerOf(current.lists, active.id);
    let items = current.lists;
    if (from && from !== data.groupId) {
      const target = items[data.groupId] ?? [];
      let index = target.length;
      if (data.type === 'row') {
        const overIndex = target.findIndex((todo) => todo.id === over.id);
        const dragged = active.rect.current.translated;
        const below = dragged ? dragged.top > over.rect.top + over.rect.height / 2 : false;
        if (overIndex >= 0) index = overIndex + (below ? 1 : 0);
      }
      items = moveInLists(items, String(active.id), data.groupId, index);
    }
    if (items !== current.lists || current.overList !== data.groupId) {
      setDrag({ ...current, lists: items, overList: data.groupId });
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const current = latest.current;
    if (!current || !lists) {
      setDrag(null);
      return;
    }
    const container = containerOf(current.lists, active.id);
    const list = lists.find((item) => item.id === container);
    let rows = container ? (current.lists[container] ?? []) : [];
    const data = dropData(over?.data.current);
    if (data?.type === 'row' && data.groupId === container && over && over.id !== active.id) {
      const oldIndex = rows.findIndex((todo) => todo.id === active.id);
      const newIndex = rows.findIndex((todo) => todo.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) rows = arrayMove([...rows], oldIndex, newIndex);
    }
    const index = rows.findIndex((todo) => todo.id === active.id);
    const unchanged =
      container === current.fromList && (index === current.fromIndex || (list !== undefined && !reorderable(list)));
    if (!over || !list || index < 0 || unchanged) {
      setDrag(null);
      return;
    }
    setDrag({ ...current, lists: { ...current.lists, [list.id]: rows }, overList: null, droppedOn: lists });
    onDrop(current.todo, list, index, rows);
  };

  const onDragCancel = () => {
    setDrag(null);
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => t.dnd.pickedUp(keyOf(active.id)),
    onDragOver: ({ active, over }) =>
      over ? t.dnd.over(keyOf(active.id), listName(dropData(over.data.current)?.groupId)) : undefined,
    // The move itself is announced by the page ("KAN-21 moved to In Progress, position 2 of 3").
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) => t.dnd.cancelled(keyOf(active.id)),
  };

  // Dragging, or dropped and the cache doesn't have the move yet.
  const preview = drag && (drag.droppedOn === null || drag.droppedOn === lists) ? drag : null;

  return {
    contextProps: {
      sensors,
      collisionDetection: listCollisions,
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel,
      accessibility: { announcements, screenReaderInstructions: instructions },
    },
    /** The todo under the pointer (DragOverlay), only while dragging. */
    activeTodo: preview && !preview.droppedOn ? preview.todo : null,
    /** The list under the drag (its `--drop` style), only while dragging. */
    overList: preview && !preview.droppedOn ? preview.overList : null,
    /** The items to show for a list while a drag is in progress, else undefined. */
    previewRows: (listId: string) => preview?.lists[listId],
  };
}
