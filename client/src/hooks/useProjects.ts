import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { createProject, deleteProject, getProject, listProjects, updateProject } from '@/api/projects';
import { queryClient } from '@/app/queryClient';
import { pageChunks, type ProjectSection } from '@/routeChunks';
import type { ProjectWithStats, UpdateProjectRequest } from '@/types/api';
import { qk } from './queryKeys';
import { boardQuery } from './useBoard';
import { sprintsQuery } from './useSprints';

const projectsQuery = queryOptions({
  queryKey: qk.projects,
  queryFn: ({ signal }) => listProjects(signal),
});

/**
 * One project. Seeded from the list when it is cached, so opening a tile or switching
 * project paints at once while the detail refetches in the background.
 */
function projectQuery(projectId: string) {
  return queryOptions({
    queryKey: qk.project(projectId),
    queryFn: ({ signal }) => getProject(projectId, signal),
    initialData: () => queryClient.getQueryData(projectsQuery.queryKey)?.find((project) => project.id === projectId),
    initialDataUpdatedAt: () => queryClient.getQueryState(qk.projects)?.dataUpdatedAt,
  });
}

/** `GET /projects`, recently updated first (PRJ-1). */
export function useProjects() {
  return useQuery(projectsQuery);
}

/** `GET /projects/:id` (PRJ-5). */
export function useProject(projectId: string | undefined) {
  return useQuery({ ...projectQuery(projectId ?? ''), enabled: Boolean(projectId) });
}

/** The project named by `:projectId` in the URL — the current project (PRJ-5). */
export function useCurrentProject() {
  const { projectId } = useParams();
  return useProject(projectId);
}

/**
 * Warms the project and its page chunk on hover/focus of a tile or sidebar link (plan §5.3),
 * so the click lands on a page that is already loaded.
 */
export function usePrefetchProject() {
  const client = useQueryClient();
  return useCallback(
    (projectId: string, section: ProjectSection = 'backlog') => {
      // Fetches only when missing or stale; a failed prefetch is ignored (the page shows its own error).
      const project = client.query(projectQuery(projectId));
      void project.catch(() => undefined);
      void pageChunks.project();
      void pageChunks[section]();
      // The board needs the active sprint's id from the project; the history needs the sprint list.
      if (section === 'board') {
        void project
          .then(({ stats }) => (stats.activeSprint ? client.query(boardQuery(stats.activeSprint.id)) : undefined))
          .catch(() => undefined);
      }
      if (section === 'sprints') void client.query(sprintsQuery(projectId)).catch(() => undefined);
    },
    [client],
  );
}

/** Puts a saved project in both caches, then refetches them (plan §5.1). */
function storeProject(project: ProjectWithStats) {
  queryClient.setQueryData(qk.project(project.id), project);
  queryClient.setQueryData<ProjectWithStats[]>(qk.projects, (list) =>
    list?.some((item) => item.id === project.id)
      ? list.map((item) => (item.id === project.id ? project : item))
      : [project, ...(list ?? [])],
  );
  void queryClient.invalidateQueries({ queryKey: qk.projects });
  void queryClient.invalidateQueries({ queryKey: qk.project(project.id) });
}

/** `POST /projects` (PRJ-2). The new project goes to the top of the list, like the server's order. */
export function useCreateProject() {
  return useMutation({
    mutationFn: createProject,
    onSuccess: storeProject,
  });
}

/** `PATCH /projects/:id` (PRJ-3). */
export function useUpdateProject() {
  return useMutation({
    mutationFn: ({ projectId, body }: { projectId: string; body: UpdateProjectRequest }) =>
      updateProject(projectId, body),
    onSuccess: storeProject,
  });
}

interface DeleteContext {
  previous: ProjectWithStats[] | undefined;
}

/**
 * `DELETE /projects/:id` (PRJ-4), optimistic (plan §10 decision 2): the tile disappears as
 * soon as the user confirms and comes back if the request fails. The caller shows the toasts.
 */
export function useDeleteProject() {
  return useMutation({
    mutationFn: (project: ProjectWithStats) => deleteProject(project.id),
    onMutate: async (project): Promise<DeleteContext> => {
      await queryClient.cancelQueries({ queryKey: qk.projects });
      const previous = queryClient.getQueryData<ProjectWithStats[]>(qk.projects);
      queryClient.setQueryData<ProjectWithStats[]>(qk.projects, (list) =>
        list?.filter((item) => item.id !== project.id),
      );
      return { previous };
    },
    onError: (_error, _project, context) => {
      if (context?.previous) queryClient.setQueryData(qk.projects, context.previous);
    },
    onSuccess: (_data, project) => {
      // The server deleted its todos and sprints too; nothing of it may stay cached.
      queryClient.removeQueries({ queryKey: qk.project(project.id) });
      queryClient.removeQueries({ queryKey: qk.todos(project.id) });
      queryClient.removeQueries({ queryKey: qk.sprints(project.id) });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.projects });
    },
  });
}
