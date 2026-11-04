import { queryOptions, useQuery } from '@tanstack/react-query';
import { listSprints } from '@/api/sprints';
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
