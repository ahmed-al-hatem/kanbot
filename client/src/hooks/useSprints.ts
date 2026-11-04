import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { completeSprint, createSprint, deleteSprint, listSprints, startSprint, updateSprint } from '@/api/sprints';
import { queryClient } from '@/app/queryClient';
import { compareTodos } from '@/lib/moveInLists';
import type {
  CompleteSprintRequest,
  CreateSprintRequest,
  ProjectWithStats,
  Sprint,
  StartSprintRequest,
  Todo,
  UpdateSprintRequest,
} from '@/types/api';
import { qk } from './queryKeys';

export function sprintsQuery(projectId: string) {
  return queryOptions({
    queryKey: qk.sprints(projectId),
    queryFn: ({ signal }) => listSprints(projectId, signal),
  });
}

/** `GET /projects/:id/sprints`: active, then planned (oldest first), then completed (newest first). */
export function useSprints(projectId: string) {
  return useQuery(sprintsQuery(projectId));
}

/**
 * Plan §5.1. Create / update / delete: the sprint list and the todo lists (a deleted sprint's
 * todos return to the backlog). Start and complete add the sprint's board, the project (its
 * active sprint) and the projects list (tiles show it); complete also adds the board of the
 * planned sprint that took the unfinished todos.
 */
function invalidateAfterSprintChange(projectId: string, { boards = [] }: { boards?: string[] } = {}) {
  void queryClient.invalidateQueries({ queryKey: qk.sprints(projectId) });
  void queryClient.invalidateQueries({ queryKey: qk.todos(projectId) });
  void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
  void queryClient.invalidateQueries({ queryKey: qk.projects });
  for (const sprintId of boards) {
    void queryClient.invalidateQueries({ queryKey: qk.sprint(sprintId) });
    void queryClient.invalidateQueries({ queryKey: qk.board(sprintId) });
  }
}

/**
 * The project's active sprint changes the moment the server says so: the board reads it from
 * `project.stats.activeSprint` (plan §5.3), so it must not wait for the refetch.
 */
function setActiveSprint(projectId: string, activeSprint: ProjectWithStats['stats']['activeSprint']) {
  queryClient.setQueryData<ProjectWithStats>(qk.project(projectId), (project) =>
    project ? { ...project, stats: { ...project.stats, activeSprint } } : project,
  );
}

/** Writes the saved sprint into the cached list right away, so the group header updates at once. */
function putSprint(projectId: string, sprint: Sprint) {
  queryClient.setQueryData<Sprint[]>(qk.sprints(projectId), (list) => {
    if (!list) return list;
    return list.some((item) => item.id === sprint.id)
      ? list.map((item) => (item.id === sprint.id ? sprint : item))
      : [...list, sprint];
  });
}

/** `POST /projects/:id/sprints` (SPR-1). */
export function useCreateSprint(projectId: string) {
  return useMutation({
    mutationFn: (body: CreateSprintRequest) => createSprint(projectId, body),
    onSuccess: (sprint) => {
      putSprint(projectId, sprint);
      invalidateAfterSprintChange(projectId);
    },
  });
}

/** `PATCH /sprints/:id` (SPR-2). */
export function useUpdateSprint(projectId: string) {
  return useMutation({
    mutationFn: ({ sprintId, body }: { sprintId: string; body: UpdateSprintRequest }) => updateSprint(sprintId, body),
    onSuccess: (sprint) => {
      putSprint(projectId, sprint);
      queryClient.setQueryData(qk.sprint(sprint.id), sprint);
      invalidateAfterSprintChange(projectId);
    },
  });
}

/** `DELETE /sprints/:id` (SPR-2): planned sprints only; the server moves their todos to the backlog. */
export function useDeleteSprint(projectId: string) {
  return useMutation({
    mutationFn: (sprint: Sprint) => deleteSprint(sprint.id),
    onSuccess: (_data, sprint) => {
      queryClient.setQueryData<Sprint[]>(qk.sprints(projectId), (list) => list?.filter((item) => item.id !== sprint.id));
      // Same as the server: its todos go to the end of the backlog, in their sprint order.
      queryClient.setQueryData<Todo[]>(qk.todos(projectId, {}), (list) => {
        if (!list) return list;
        let order = Math.max(-1, ...list.filter((todo) => todo.sprintId === null).map((todo) => todo.order));
        return list
          .map((todo) => (todo.sprintId === sprint.id ? { ...todo, sprintId: null, order: (order += 1) } : todo))
          .sort(compareTodos);
      });
      queryClient.removeQueries({ queryKey: qk.sprint(sprint.id) });
      invalidateAfterSprintChange(projectId);
    },
  });
}

/** `POST /sprints/:id/start` (SPR-3). */
export function useStartSprint(projectId: string) {
  return useMutation({
    mutationFn: ({ sprintId, body }: { sprintId: string; body: StartSprintRequest }) => startSprint(sprintId, body),
    onSuccess: (sprint) => {
      putSprint(projectId, sprint);
      setActiveSprint(projectId, { id: sprint.id, name: sprint.name });
      invalidateAfterSprintChange(projectId, { boards: [sprint.id] });
    },
  });
}

/**
 * `POST /sprints/:id/complete` (SPR-6): the server stores `completedStats`, moves the unfinished
 * todos to the backlog or a planned sprint, and the project has no active sprint any more.
 */
export function useCompleteSprint(projectId: string) {
  return useMutation({
    mutationFn: ({ sprintId, body }: { sprintId: string; body: CompleteSprintRequest }) => completeSprint(sprintId, body),
    onSuccess: (sprint, { body }) => {
      putSprint(projectId, sprint);
      queryClient.setQueryData(qk.sprint(sprint.id), sprint);
      setActiveSprint(projectId, null);
      const boards = body.moveUnfinishedTo === 'backlog' ? [sprint.id] : [sprint.id, body.moveUnfinishedTo];
      invalidateAfterSprintChange(projectId, { boards });
    },
  });
}
