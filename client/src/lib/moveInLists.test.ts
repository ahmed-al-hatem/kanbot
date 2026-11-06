import { describe, expect, it } from 'vitest';
import { makeTodo } from '@/test/todos';
import { applyMove, currentPlace, dropTarget, moveInLists } from './moveInLists';

const item = (id: string) => ({ id });
const ids = (lists: Readonly<Record<string, readonly { id: string }[]>>) =>
  Object.fromEntries(
    Object.entries(lists).map(([key, list]) => [key, list.map((entry) => entry.id)]),
  );

describe('moveInLists (plan §3.5: position = index after removing the item)', () => {
  const lists = {
    backlog: ['a', 'b', 'c', 'd'].map(item),
    sprint: ['x', 'y'].map(item),
    empty: [],
  };

  it('reorders inside one list, down and up', () => {
    expect(ids(moveInLists(lists, 'a', 'backlog', 2)).backlog).toEqual(['b', 'c', 'a', 'd']);
    expect(ids(moveInLists(lists, 'd', 'backlog', 0)).backlog).toEqual(['d', 'a', 'b', 'c']);
    // The last index of the list without the item is its length - 1.
    expect(ids(moveInLists(lists, 'b', 'backlog', 3)).backlog).toEqual(['a', 'c', 'd', 'b']);
  });

  it('moves across lists and keeps the other lists untouched', () => {
    const next = moveInLists(lists, 'b', 'sprint', 1);
    expect(ids(next)).toEqual({ backlog: ['a', 'c', 'd'], sprint: ['x', 'b', 'y'], empty: [] });
    expect(next.empty).toBe(lists.empty);
    expect(lists.backlog).toHaveLength(4); // the input is not mutated
  });

  it('clamps at the edges and fills an empty list', () => {
    expect(ids(moveInLists(lists, 'a', 'sprint', 99)).sprint).toEqual(['x', 'y', 'a']);
    expect(ids(moveInLists(lists, 'a', 'sprint', -3)).sprint).toEqual(['a', 'x', 'y']);
    expect(ids(moveInLists(lists, 'c', 'empty', 5)).empty).toEqual(['c']);
  });

  it('returns the lists unchanged for an unknown item or target list', () => {
    expect(moveInLists(lists, 'nope', 'backlog', 0)).toBe(lists);
    expect(moveInLists(lists, 'a', 'nowhere', 0)).toBe(lists);
  });
});

describe('applyMove (the server rules on the cached project list)', () => {
  const todos = [
    makeTodo({ id: 'b1', key: 'KAN-1', title: 'one', order: 0 }),
    makeTodo({ id: 'b2', key: 'KAN-2', title: 'two', order: 1 }),
    makeTodo({ id: 'b3', key: 'KAN-3', title: 'three', order: 2 }),
    makeTodo({
      id: 's1',
      key: 'KAN-4',
      title: 'todo col',
      sprintId: 's',
      status: 'todo',
      order: 0,
    }),
    makeTodo({
      id: 's2',
      key: 'KAN-5',
      title: 'doing col',
      sprintId: 's',
      status: 'in_progress',
      order: 0,
    }),
  ];

  it('reorders the backlog and renumbers `order`', () => {
    const next = applyMove(todos, 'b3', { sprintId: null, status: 'todo', position: 0 });
    const backlog = next.filter((todo) => todo.sprintId === null);
    expect(backlog.map((todo) => [todo.id, todo.order])).toEqual([
      ['b3', 0],
      ['b1', 1],
      ['b2', 2],
    ]);
  });

  it('moves into a sprint status column and keeps the server order (columns, then order)', () => {
    const next = applyMove(todos, 'b1', { sprintId: 's', status: 'todo', position: 0 });
    expect(next.filter((todo) => todo.sprintId === 's').map((todo) => todo.id)).toEqual([
      'b1',
      's1',
      's2',
    ]);
    expect(
      next.filter((todo) => todo.sprintId === null).map((todo) => [todo.id, todo.order]),
    ).toEqual([
      ['b2', 0],
      ['b3', 1],
    ]);
  });

  it('currentPlace undoes a move', () => {
    const from = currentPlace(todos, 'b2');
    expect(from).toEqual({ sprintId: null, status: 'todo', position: 1 });
    const moved = applyMove(todos, 'b2', { sprintId: 's', status: 'todo', position: 1 });
    const back = applyMove(moved, 'b2', from!);
    expect(back.filter((todo) => todo.sprintId === null).map((todo) => todo.id)).toEqual([
      'b1',
      'b2',
      'b3',
    ]);
  });
});

describe('dropTarget (group index → server position)', () => {
  const sprintRows = [
    makeTodo({ id: 'a', key: 'KAN-1', title: 'a', sprintId: 's', status: 'todo' }),
    makeTodo({ id: 'b', key: 'KAN-2', title: 'b', sprintId: 's', status: 'todo' }),
    makeTodo({ id: 'c', key: 'KAN-3', title: 'c', sprintId: 's', status: 'in_review' }),
  ];
  const incoming = makeTodo({ id: 'n', key: 'KAN-9', title: 'new' });

  it('uses the index as the position in the backlog', () => {
    expect(dropTarget(sprintRows, incoming, null, 2)).toEqual({
      sprintId: null,
      status: 'todo',
      position: 2,
    });
  });

  it('counts only same-status todos above the drop point in a sprint', () => {
    expect(dropTarget(sprintRows, incoming, 's', 1)).toMatchObject({ sprintId: 's', position: 1 });
    // Dropped after the In Review row: still the end of the To Do column.
    expect(dropTarget(sprintRows, incoming, 's', 3)).toMatchObject({ position: 2 });
  });

  it('leaves the moved todo out of the count', () => {
    expect(dropTarget(sprintRows, sprintRows[0]!, 's', 1)).toMatchObject({ position: 1 });
  });
});
