import { useMemo } from 'react';
import { useT } from '@/i18n';
import type { Sprint, Todo } from '@/types/api';
import { useSprints } from './useSprints';
import { useProjectTodos } from './useTodos';

export type BacklogGroupKind = 'active' | 'planned' | 'backlog';

export interface BacklogGroup {
  /** The sprint id, or `backlog`. */
  id: string;
  kind: BacklogGroupKind;
  name: string;
  sprint: Sprint | null;
  /** In the server's order (plan §3.5): `order`, by status column inside a sprint. */
  todos: Todo[];
  points: number;
}

const BACKLOG = 'backlog';

/** `select` for the todos query: one list split by `sprintId` (plan §5.3). Stable, so memoized. */
function bySprint(todos: Todo[]): Map<string, Todo[]> {
  const groups = new Map<string, Todo[]>();
  for (const todo of todos) {
    const key = todo.sprintId ?? BACKLOG;
    const list = groups.get(key);
    if (list) list.push(todo);
    else groups.set(key, [todo]);
  }
  return groups;
}

export function sumPoints(todos: readonly Todo[]): number {
  return todos.reduce((total, todo) => total + (todo.storyPoints ?? 0), 0);
}

/**
 * Groups in display order (DESIGN §9 04): the active sprint, the planned sprints (the API
 * already lists them oldest first), then the Backlog. Completed sprints keep their todos as
 * history and aren't shown here. `backlogName` is the Backlog group's heading in the UI language.
 */
export function buildBacklogGroups(
  todosBySprint: Map<string, Todo[]>,
  sprints: readonly Sprint[],
  backlogName: string,
): BacklogGroup[] {
  const group = (kind: BacklogGroupKind, id: string, name: string, sprint: Sprint | null): BacklogGroup => {
    const todos = todosBySprint.get(id) ?? [];
    return { id, kind, name, sprint, todos, points: sumPoints(todos) };
  };
  const active = sprints.filter((sprint) => sprint.status === 'active');
  const planned = sprints.filter((sprint) => sprint.status === 'planned');
  return [
    ...active.map((sprint) => group('active', sprint.id, sprint.name, sprint)),
    ...planned.map((sprint) => group('planned', sprint.id, sprint.name, sprint)),
    group('backlog', BACKLOG, backlogName, null),
  ];
}

/**
 * The Backlog page data (BL-1): todos and sprints requested in parallel — no waterfall
 * (NFR-6) — then split into groups client-side.
 */
export function useBacklog(projectId: string) {
  const backlogName = useT().backlog.groupName;
  const todos = useProjectTodos(projectId, bySprint);
  const sprints = useSprints(projectId);
  const groups = useMemo(
    () => (todos.data && sprints.data ? buildBacklogGroups(todos.data, sprints.data, backlogName) : undefined),
    [todos.data, sprints.data, backlogName],
  );

  // Only a failure with nothing to show; a failed background refetch keeps the old data.
  const todosError = todos.data ? null : todos.error;
  const sprintsError = sprints.data ? null : sprints.error;

  return {
    groups,
    isPending: todos.isPending || sprints.isPending,
    error: todosError ?? sprintsError,
    isRefetching: todos.isRefetching || sprints.isRefetching,
    refetch: () => {
      if (todos.isError) void todos.refetch();
      if (sprints.isError) void sprints.refetch();
    },
  };
}
