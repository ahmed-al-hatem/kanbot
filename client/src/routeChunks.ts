/**
 * Lazy page chunks, shared by the router and the hover/focus prefetch (plan §5.3), so a
 * prefetched chunk is the very module the route loads.
 */
export const pageChunks = {
  shell: () => import('@/features/shell/AppShell'),
  projects: () => import('@/features/projects/ProjectsPage'),
  project: () => import('@/features/shell/ProjectLayout'),
  backlog: () => import('@/features/backlog/BacklogPage'),
  board: () => import('@/features/board/BoardPage'),
  sprints: () => import('@/features/sprints/SprintsPage'),
};

export type ProjectSection = 'backlog' | 'board' | 'sprints';
