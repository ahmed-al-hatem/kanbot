import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { projectHandlers } from '@/test/projects';
import { preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeSprint, makeTodo, makeTodoDb, SPRINT_3, SPRINT_4, todoHandlers, type TodoDb } from '@/test/todos';
import { mostRecentSprint, sprintNumbers } from './sprintHistory';

let db: TodoDb;

beforeAll(preloadPages, 30_000);

/**
 * Sprint 2 was completed with 6 todos (4 done, 15 of 20 points, 2 carried over): only its two
 * Done todos (10 points) are still in it, so its live stats differ from its snapshot.
 */
const SPRINT_2 = makeSprint({
  id: 's2',
  name: 'Sprint 2',
  status: 'completed',
  startDate: '2026-10-06',
  endDate: '2026-10-19',
  goal: 'Board MVP',
  completedAt: '2026-10-19T17:00:00.000Z',
  completedStats: {
    totalTodos: 6,
    doneTodos: 4,
    totalPoints: 20,
    donePoints: 15,
    byStatus: { todo: 1, in_progress: 1, in_review: 0, done: 4 },
    carriedOver: 2,
  },
});
const SPRINT_1 = makeSprint({
  id: 's1',
  name: 'Sprint 1',
  status: 'completed',
  completedAt: '2026-10-05T17:00:00.000Z',
  completedStats: { ...SPRINT_2.completedStats!, carriedOver: 0 },
});

function historyDb(sprints = [SPRINT_3, SPRINT_4, SPRINT_2, SPRINT_1]) {
  return makeTodoDb(
    [
      makeTodo({ id: 'a1', key: 'KAN-21', title: 'Validate signup form', sprintId: 's3', storyPoints: 3 }),
      makeTodo({ id: 'a2', key: 'KAN-15', title: 'Set up routing', sprintId: 's3', status: 'done', storyPoints: 5 }),
      makeTodo({ id: 'd1', key: 'KAN-10', title: 'Board columns', sprintId: 's2', status: 'done', storyPoints: 5 }),
      makeTodo({ id: 'd2', key: 'KAN-11', title: 'Card layout', sprintId: 's2', status: 'done', storyPoints: 5, order: 1 }),
    ],
    sprints,
  );
}

function start(todoDb: TodoDb) {
  db = todoDb;
  server.use(...todoHandlers(db), ...projectHandlers());
}

beforeEach(() => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
});

/** A stat tile of the detail panel, by its label (the Completed lozenge has the same text). */
const tile = (label: string) =>
  within(screen.getByRole('region', { name: /^Sprint/ })).getByText(label, { selector: '.label' }).parentElement;
const sprintList = () => screen.getByRole('navigation', { name: 'All sprints' });

describe('sprint history helpers (SPR-7)', () => {
  it('uses the completion snapshot for completed sprints and live stats otherwise', () => {
    expect(sprintNumbers({ ...SPRINT_2, stats: { ...SPRINT_2.stats, donePoints: 10, totalPoints: 10 } })).toMatchObject({
      doneTodos: 4,
      donePoints: 15,
      totalPoints: 20,
      completion: 75,
      carriedOver: 2,
    });
    const live = { ...SPRINT_3, stats: { totalTodos: 2, doneTodos: 1, totalPoints: 8, donePoints: 5, byStatus: SPRINT_3.stats.byStatus } };
    expect(sprintNumbers(live)).toMatchObject({ donePoints: 5, totalPoints: 8, completion: 63, carriedOver: null, unfinished: 1 });
    // No estimates: completion by todos.
    expect(sprintNumbers({ ...live, stats: { ...live.stats, totalPoints: 0, donePoints: 0 } }).completion).toBe(50);
  });

  it('picks the active sprint, else the last completed, else the first planned', () => {
    expect(mostRecentSprint([SPRINT_3, SPRINT_4, SPRINT_2])?.id).toBe('s3');
    expect(mostRecentSprint([SPRINT_4, SPRINT_2, SPRINT_1])?.id).toBe('s2');
    expect(mostRecentSprint([SPRINT_4])?.id).toBe('s4');
    expect(mostRecentSprint([])).toBeUndefined();
  });
});

describe('sprints page (SPR-7)', () => {
  it('lists every sprint and opens the most recent one without a sprint id', async () => {
    start(historyDb());
    renderApp('/projects/p1/sprints');

    expect(await screen.findByRole('heading', { name: 'Sprint 3', level: 2 }, { timeout: 3000 })).toBeInTheDocument();
    const links = within(sprintList()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringMatching(/^Sprint 3Active.*5 \/ 8 pts$/),
      expect.stringMatching(/^Sprint 4Planned.*0 \/ 0 pts$/),
      expect.stringMatching(/^Sprint 2Completed.*Oct 6 – Oct 19.*15 \/ 20 pts$/),
      expect.stringMatching(/^Sprint 1Completed/),
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
    expect(links[0]).toHaveAttribute('href', '/projects/p1/sprints/s3');
    expect(screen.getByText('4 sprints')).toBeInTheDocument();

    // The active sprint: live stats, and its todos.
    expect(tile('Completed')).toHaveTextContent('1 todo');
    expect(tile('Points done')).toHaveTextContent('5 / 8');
    expect(tile('Completion')).toHaveTextContent('63%');
    expect(tile('Not finished')).toHaveTextContent('1 todo');
    expect(await screen.findByRole('button', { name: 'Validate signup form' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set up routing' })).toBeInTheDocument();

    await expectNoAxeViolations(screen.getByRole('main'));
  });

  it('without an active sprint, opens the last completed one', async () => {
    start(historyDb([SPRINT_4, SPRINT_2, SPRINT_1]));
    renderApp('/projects/p1/sprints');
    expect(await screen.findByRole('heading', { name: 'Sprint 2', level: 2 }, { timeout: 3000 })).toBeInTheDocument();
    expect(within(sprintList()).getByRole('link', { current: 'page' })).toHaveTextContent(/^Sprint 2/);
  });

  it('shows the completion snapshot for a completed sprint, not its live numbers', async () => {
    start(historyDb());
    renderApp('/projects/p1/sprints/s2');

    expect(await screen.findByRole('heading', { name: 'Sprint 2', level: 2 }, { timeout: 3000 })).toBeInTheDocument();
    expect(within(sprintList()).getByRole('link', { current: 'page' })).toHaveTextContent(/^Sprint 2/);
    expect(screen.getByText(/Board MVP/)).toHaveTextContent('Goal: Board MVP');
    // Live: 2 todos, 10 of 10 points. Snapshot: 4 of 6 todos, 15 of 20 points, 2 carried over.
    expect(tile('Completed')).toHaveTextContent('4 todos');
    expect(tile('Points done')).toHaveTextContent('15 / 20');
    expect(tile('Completion')).toHaveTextContent('75%');
    expect(tile('Carried over')).toHaveTextContent('2 todos');
    expect(screen.getByText('Numbers as they were when the sprint was completed.')).toBeInTheDocument();
    // Its todos are the ones that stayed: the Done ones.
    expect(await screen.findByRole('button', { name: 'Board columns' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Card layout' })).toBeInTheDocument();
  });

  it('selects another sprint from the list and opens a todo from it', async () => {
    const user = userEvent.setup();
    start(historyDb());
    const { router } = renderApp('/projects/p1/sprints');

    const list = await screen.findByRole('navigation', { name: 'All sprints' }, { timeout: 3000 });
    await user.click(within(list).getByRole('link', { name: /^Sprint 2/ }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/sprints/s2');
    });
    expect(await screen.findByRole('heading', { name: 'Sprint 2', level: 2 })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Board columns' }));
    expect(router.state.location.search).toBe('?todo=d1');
  });

  it('shows the 404 page for a sprint id that is not in the project', async () => {
    start(historyDb());
    renderApp('/projects/p1/sprints/nope');
    expect(
      await screen.findByRole('heading', { name: "This sprint doesn't exist", level: 1 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Active Sprint' })).toHaveAttribute('href', '/projects/p1/board');
  });

  it('has an empty state when there are no sprints', async () => {
    start(makeTodoDb([], []));
    renderApp('/projects/p1/sprints');
    expect(await screen.findByRole('heading', { name: 'No sprints yet' }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Backlog' })).toHaveAttribute('href', '/projects/p1/backlog');
  });
});
