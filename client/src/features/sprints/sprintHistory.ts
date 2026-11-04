import type { LozengeTone } from '@/components/Lozenge/Lozenge';
import type { Sprint, SprintStatus } from '@/types/api';

/** DESIGN §7 Lozenge for sprint status: Planned gray, Active blue (pulsing dot), Completed green. */
export const SPRINT_STATUS: Record<SprintStatus, { label: string; tone: LozengeTone; live: boolean }> = {
  active: { label: 'Active', tone: 'blue', live: true },
  planned: { label: 'Planned', tone: 'gray', live: false },
  completed: { label: 'Completed', tone: 'green', live: false },
};

/**
 * The numbers to show for a sprint (SPR-7): the snapshot taken at completion for a completed
 * sprint (its live stats only count the todos still in it — the Done ones), the live stats
 * otherwise.
 */
export function sprintNumbers(sprint: Sprint) {
  const stats = sprint.completedStats ?? sprint.stats;
  const { doneTodos, totalTodos, donePoints, totalPoints } = stats;
  // Points when the sprint has any estimates, else todos, so an unestimated sprint isn't stuck at 0%.
  const completion =
    totalPoints > 0
      ? Math.round((donePoints / totalPoints) * 100)
      : totalTodos > 0
        ? Math.round((doneTodos / totalTodos) * 100)
        : 0;
  return {
    doneTodos,
    totalTodos,
    donePoints,
    totalPoints,
    completion,
    carriedOver: sprint.completedStats?.carriedOver ?? null,
    unfinished: totalTodos - doneTodos,
  };
}

/**
 * `/sprints` without an id (plan §9.3, DESIGN §6b "the most recent sprint"): the active sprint,
 * else the last completed one, else the first planned one. The list comes from the server as
 * active → planned (oldest first) → completed (newest first).
 */
export function mostRecentSprint(sprints: readonly Sprint[]): Sprint | undefined {
  return (
    sprints.find((sprint) => sprint.status === 'active') ??
    sprints.find((sprint) => sprint.status === 'completed') ??
    sprints.find((sprint) => sprint.status === 'planned')
  );
}
