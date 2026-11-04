import { queryOptions, useMutation, useMutationState, useQuery } from '@tanstack/react-query';
import { chat, generateTodos, getAiStatus, planSprint, summarizeSprint } from '@/api/ai';
import { queryClient } from '@/app/queryClient';
import { toast } from '@/stores/toast';
import type {
  ChatMessage,
  GenerateTodosRequest,
  PlanSprintRequest,
  Sprint,
  SprintBoardResponse,
} from '@/types/api';
import { qk } from './queryKeys';
import { putSprint } from './useSprints';

/** `GET /ai/status` (AI-5): asked once per session — the mode only changes when the server restarts. */
export const aiStatusQuery = queryOptions({
  queryKey: qk.aiStatus,
  queryFn: ({ signal }) => getAiStatus(signal),
  staleTime: Infinity,
  gcTime: Infinity,
});

export function useAiStatus() {
  return useQuery(aiStatusQuery);
}

/** `POST /projects/:id/ai/chat` (AI-1): stateless, so the whole conversation goes every time. */
export function useChat() {
  return useMutation({
    mutationKey: ['ai-chat'],
    mutationFn: ({ projectId, messages }: { projectId: string; messages: ChatMessage[] }) =>
      chat(projectId, { messages }),
  });
}

/** `POST /projects/:id/ai/generate-todos` (AI-2). Nothing is saved: the drafts go to the bulk create. */
export function useGenerateTodos(projectId: string) {
  return useMutation({
    mutationFn: (body: GenerateTodosRequest) => generateTodos(projectId, body),
  });
}

/** `POST /projects/:id/ai/plan-sprint` (AI-3). A suggestion only; Create sprint saves it. */
export function usePlanSprint(projectId: string) {
  return useMutation({
    mutationFn: (body: PlanSprintRequest) => planSprint(projectId, body),
  });
}

export interface SummaryVariables {
  sprint: Pick<Sprint, 'id' | 'name' | 'projectId'>;
  /**
   * Asked for by Complete sprint, whose dialog is gone by the time the answer comes: a failure
   * is a toast (the sprint stays completed; the summary card offers Try again).
   */
  notify?: boolean;
}

const SUMMARY_KEY = ['ai-summary'] as const;

/** The saved summary lands on the sprint in every cache that holds it: the list, the sprint, its board. */
function putSummary(sprint: Sprint) {
  putSprint(sprint.projectId, sprint);
  queryClient.setQueryData<Sprint>(qk.sprint(sprint.id), (cached) => (cached ? sprint : cached));
  queryClient.setQueryData<SprintBoardResponse>(qk.board(sprint.id), (board) =>
    board ? { ...board, sprint: { ...board.sprint, summary: sprint.summary } } : board,
  );
}

/**
 * `POST /sprints/:id/ai/summary` (AI-4): the server writes the Markdown summary and saves it on
 * the sprint. The callbacks live on the mutation (not on `mutate`), so they run even when the
 * component that asked is gone — Complete sprint asks, then navigates to the sprint's page.
 */
export function useSummarizeSprint() {
  return useMutation({
    mutationKey: SUMMARY_KEY,
    mutationFn: ({ sprint }: SummaryVariables) => summarizeSprint(sprint.id),
    onSuccess: (response) => {
      putSummary(response.sprint);
    },
    onError: (error, { sprint, notify }) => {
      if (notify) toast.error(`${sprint.name} is completed, but its AI summary failed. ${error.message}`);
    },
  });
}

interface SummaryRequestState {
  status: 'idle' | 'pending' | 'success' | 'error';
  error: Error | null;
  submittedAt: number;
}

/**
 * The latest summary request for one sprint, whoever started it (the card, Complete sprint, the
 * drawer's Summarize chip), so the card shows it loading or failed.
 */
export function useSprintSummaryRequest(sprintId: string): SummaryRequestState | undefined {
  const states = useMutationState({
    filters: {
      mutationKey: SUMMARY_KEY,
      // `variables` is `unknown` in the cache; every mutation under this key is a useSummarizeSprint.
      predicate: (m) => (m.state.variables as SummaryVariables | undefined)?.sprint.id === sprintId,
    },
    select: (m): SummaryRequestState => ({ status: m.state.status, error: m.state.error, submittedAt: m.state.submittedAt }),
  });
  return states.reduce<SummaryRequestState | undefined>(
    (last, item) => (!last || item.submittedAt >= last.submittedAt ? item : last),
    undefined,
  );
}
