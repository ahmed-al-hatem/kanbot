import type { TodoListQuery } from '@/types/api';

/**
 * The one query-key factory (plan §5.1). `todos(pid)` without filters is the prefix
 * that invalidates every todo list of a project.
 */
export const qk = {
  me: ['me'] as const,
  projects: ['projects'] as const,
  project: (projectId: string) => ['project', projectId] as const,
  todos: (projectId: string, filters?: TodoListQuery) =>
    filters ? (['todos', projectId, filters] as const) : (['todos', projectId] as const),
  sprints: (projectId: string) => ['sprints', projectId] as const,
  sprint: (sprintId: string) => ['sprint', sprintId] as const,
  board: (sprintId: string) => ['board', sprintId] as const,
  aiStatus: ['ai-status'] as const,
};
