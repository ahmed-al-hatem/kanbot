import type {
  AiStatusResponse,
  ChatRequest,
  ChatResponse,
  GenerateTodosRequest,
  GenerateTodosResponse,
  PlanSprintRequest,
  PlanSprintResponse,
  SprintSummaryResponse,
} from '@/types/api';
import { AI_TIMEOUT_MS, request } from './client';

export function getAiStatus(signal?: AbortSignal): Promise<AiStatusResponse> {
  return request<AiStatusResponse>('GET', '/ai/status', { signal });
}

/** Stateless: send the whole conversation every time. */
export function chat(
  projectId: string,
  body: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  return request<ChatResponse>('POST', `/projects/${projectId}/ai/chat`, {
    body,
    signal,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

export function generateTodos(
  projectId: string,
  body: GenerateTodosRequest,
  signal?: AbortSignal,
): Promise<GenerateTodosResponse> {
  return request<GenerateTodosResponse>('POST', `/projects/${projectId}/ai/generate-todos`, {
    body,
    signal,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

export function planSprint(
  projectId: string,
  body: PlanSprintRequest,
  signal?: AbortSignal,
): Promise<PlanSprintResponse> {
  return request<PlanSprintResponse>('POST', `/projects/${projectId}/ai/plan-sprint`, {
    body,
    signal,
    timeoutMs: AI_TIMEOUT_MS,
  });
}

/** Works for active and completed sprints; the summary is saved on the sprint. */
export function summarizeSprint(
  sprintId: string,
  signal?: AbortSignal,
): Promise<SprintSummaryResponse> {
  return request<SprintSummaryResponse>('POST', `/sprints/${sprintId}/ai/summary`, {
    signal,
    timeoutMs: AI_TIMEOUT_MS,
  });
}
