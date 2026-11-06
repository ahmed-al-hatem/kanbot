import type { Announcements } from '@dnd-kit/core';
import { renderHook } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { switchToArabic } from '@/test/locale';
import { makeTodo } from '@/test/todos';
import { useListsDnd, type DndList } from './useListsDnd';

/** Arabic (R3): dnd-kit's screen-reader announcements come from `t.dnd` (shared by backlog and board). */

beforeAll(async () => {
  await import('@/i18n/messages/ar');
}, 30_000);

const LISTS: DndList[] = [
  {
    id: 's3',
    name: 'Sprint 3',
    todos: [makeTodo({ id: 't1', key: 'KAN-28', title: 'Drag', sprintId: 's3' })],
  },
  { id: 'backlog', name: 'قائمة الانتظار', todos: [] },
];

// The announcement callbacks read only `id` (and the drop data); the rest of dnd-kit's event isn't needed.
type Arg<K extends keyof Announcements> = Parameters<NonNullable<Announcements[K]>>[0];
const event = <K extends keyof Announcements>(value: unknown) => value as Arg<K>;

function announcements() {
  const { result } = renderHook(() =>
    useListsDnd(LISTS, vi.fn(), {
      // Sensors are only passed through to DndContext; none are needed to read the announcements.
      sensors: [],
      instructions: { draggable: '' },
    }),
  );
  return result.current.contextProps.accessibility.announcements;
}

describe('drag and drop announcements in Arabic', () => {
  it('pick up, over a list and cancel read in Arabic', async () => {
    await switchToArabic();
    const say = announcements();

    expect(say.onDragStart(event<'onDragStart'>({ active: { id: 't1' } }))).toBe('التُقط KAN-28.');
    expect(
      say.onDragOver(
        event<'onDragOver'>({
          active: { id: 't1' },
          over: { id: 'backlog', data: { current: { type: 'group', groupId: 'backlog' } } },
        }),
      ),
    ).toBe('KAN-28 فوق قائمة الانتظار.');
    expect(say.onDragCancel(event<'onDragCancel'>({ active: { id: 't1' }, over: null }))).toBe(
      'أُلغي النقل. عاد KAN-28 إلى مكانه.',
    );
    // An unknown todo or list falls back to the dictionary's words, not English.
    expect(say.onDragStart(event<'onDragStart'>({ active: { id: 'gone' } }))).toBe('التُقط البند.');
    expect(
      say.onDragOver(
        event<'onDragOver'>({
          active: { id: 't1' },
          over: { id: 'x', data: { current: { type: 'group', groupId: 'x' } } },
        }),
      ),
    ).toBe('KAN-28 فوق القائمة.');
  });

  it('English keeps the old wording', () => {
    const say = announcements();
    expect(say.onDragStart(event<'onDragStart'>({ active: { id: 't1' } }))).toBe(
      'Picked up KAN-28.',
    );
    expect(say.onDragCancel(event<'onDragCancel'>({ active: { id: 't1' }, over: null }))).toBe(
      'Move cancelled. KAN-28 is back where it was.',
    );
  });
});
