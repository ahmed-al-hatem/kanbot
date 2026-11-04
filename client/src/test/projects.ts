import { http, HttpResponse } from 'msw';
import type { ProjectWithStats } from '@/types/api';
import { errorBody } from './renderApp';
import { apiUrl } from './server';
import { makeSprint } from './todos';

/** A `ProjectWithStats` with test defaults. */
export function makeProject(overrides: Partial<ProjectWithStats> & Pick<ProjectWithStats, 'id' | 'name' | 'key'>) {
  return {
    description: '',
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    stats: { backlogCount: 0, totalTodos: 0, activeSprint: null },
    ...overrides,
  } satisfies ProjectWithStats;
}

export const KANBOT = makeProject({
  id: 'p1',
  name: 'Kanbot App',
  key: 'KAN',
  description: 'Frontend for the Kanbot sprint board.',
  stats: { backlogCount: 12, totalTodos: 24, activeSprint: { id: 's3', name: 'Sprint 3' } },
});

export const PORTFOLIO = makeProject({
  id: 'p2',
  name: 'Portfolio Site',
  key: 'PORT',
  description: 'Personal portfolio and blog rebuild.',
  stats: { backlogCount: 1, totalTodos: 3, activeSprint: null },
});

/**
 * `GET /projects` and `GET /projects/:id` backed by `projects`, plus empty todo and sprint
 * lists and an empty board so a project page (backlog, board) can load. A test adds its own handlers with
 * `server.use` afterwards, and those win; in one `server.use` call the first match wins, so
 * pass `todoHandlers` before these.
 */
export function projectHandlers(projects: ProjectWithStats[] = [KANBOT, PORTFOLIO]) {
  return [
    http.get(apiUrl('/projects'), () => HttpResponse.json({ projects })),
    http.get(apiUrl('/projects/:projectId'), ({ params }) => {
      const project = projects.find((item) => item.id === params.projectId);
      return project
        ? HttpResponse.json({ project })
        : HttpResponse.json(errorBody('NOT_FOUND', 'Project not found'), { status: 404 });
    }),
    http.get(apiUrl('/projects/:projectId/todos'), () => HttpResponse.json({ todos: [] })),
    http.get(apiUrl('/projects/:projectId/sprints'), () => HttpResponse.json({ sprints: [] })),
    // An empty board for the active sprint of a project page that isn't about the board.
    http.get(apiUrl('/sprints/:sprintId/todos'), ({ params }) =>
      HttpResponse.json({
        sprint: makeSprint({ id: String(params.sprintId), name: 'Sprint 3', status: 'active' }),
        columns: { todo: [], in_progress: [], in_review: [], done: [] },
      }),
    ),
  ];
}
