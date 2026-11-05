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
  notFound: () => import('@/features/errors/NotFoundPage'),
};

export type ProjectSection = 'backlog' | 'board' | 'sprints';

/**
 * Warms a page chunk on hover or focus (plan §5.3). A failed prefetch (offline, or a deploy
 * replaced the chunk) is ignored here: the route itself shows the error if the user clicks.
 */
export function prefetchChunk(section: keyof typeof pageChunks) {
  pageChunks[section]().catch(() => undefined);
}
