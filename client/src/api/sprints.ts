import type {
  CompleteSprintRequest,
  CreateSprintRequest,
  Sprint,
  SprintBoardResponse,
  SprintListResponse,
  StartSprintRequest,
  UpdateSprintRequest,
} from '@/types/api';
import { request } from './client';

interface SprintResponse {
  sprint: Sprint;
}

/** Active first, then planned (oldest first), then completed (newest first). */
export async function listSprints(projectId: string, signal?: AbortSignal): Promise<Sprint[]> {
  const { sprints } = await request<SprintListResponse>('GET', `/projects/${projectId}/sprints`, {
    signal,
  });
  return sprints;
}

export async function getSprint(sprintId: string, signal?: AbortSignal): Promise<Sprint> {
  const { sprint } = await request<SprintResponse>('GET', `/sprints/${sprintId}`, { signal });
  return sprint;
}

/** The board: the sprint plus its todos by status column. */
export function getBoard(sprintId: string, signal?: AbortSignal): Promise<SprintBoardResponse> {
  return request<SprintBoardResponse>('GET', `/sprints/${sprintId}/todos`, { signal });
}

export async function createSprint(projectId: string, body: CreateSprintRequest): Promise<Sprint> {
  const { sprint } = await request<SprintResponse>('POST', `/projects/${projectId}/sprints`, {
    body,
  });
  return sprint;
}

export async function updateSprint(sprintId: string, body: UpdateSprintRequest): Promise<Sprint> {
  const { sprint } = await request<SprintResponse>('PATCH', `/sprints/${sprintId}`, { body });
  return sprint;
}

/** Planned sprints only; their todos go back to the backlog. */
export function deleteSprint(sprintId: string): Promise<void> {
  return request<undefined>('DELETE', `/sprints/${sprintId}`);
}

export async function startSprint(sprintId: string, body: StartSprintRequest): Promise<Sprint> {
  const { sprint } = await request<SprintResponse>('POST', `/sprints/${sprintId}/start`, { body });
  return sprint;
}

export async function completeSprint(
  sprintId: string,
  body: CompleteSprintRequest,
): Promise<Sprint> {
  const { sprint } = await request<SprintResponse>('POST', `/sprints/${sprintId}/complete`, {
    body,
  });
  return sprint;
}
