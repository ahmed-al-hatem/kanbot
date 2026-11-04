import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { qk } from '@/hooks/queryKeys';
import { boardTodos, sprintStatsOf, withBoardTodos } from '@/lib/board';
import { daysRemaining } from '@/lib/format';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { KANBOT, makeProject, PORTFOLIO, projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodo, makeTodoDb, SPRINT_3, SPRINT_4, todoHandlers, type TodoDb } from '@/test/todos';
import type { SprintBoardResponse } from '@/types/api';

let db: TodoDb;

beforeAll(preloadPages, 30_000);

/** Sprint 3 (active) with five todos over the four columns — 13 points, 3 done — and Sprint 4 planned. */
function boardDb() {
  return makeTodoDb(
    [
      makeTodo({ id: 'a1', key: 'KAN-21', title: 'Validate signup form', sprintId: 's3', storyPoints: 3, order: 0 }),
      makeTodo({ id: 'a2', key: 'KAN-22', title: 'Board filters', sprintId: 's3', storyPoints: 2, order: 1 }),
      makeTodo({
        id: 'a3',
        key: 'KAN-18',
        title: 'Drag cards between columns',
        sprintId: 's3',
        status: 'in_progress',
        type: 'story',
        priority: 'high',
        storyPoints: 5,
        labels: ['frontend'],
        dueDate: '2020-01-01',
      }),
      makeTodo({ id: 'a4', key: 'KAN-19', title: 'Review empty states', sprintId: 's3', status: 'in_review' }),
      makeTodo({ id: 'a5', key: 'KAN-15', title: 'Set up routing', sprintId: 's3', status: 'done', storyPoints: 3 }),
      makeTodo({ id: 'b1', key: 'KAN-31', title: 'Login screen', storyPoints: 3 }),
      makeTodo({ id: 'c1', key: 'KAN-35', title: 'Planned work', sprintId: 's4', storyPoints: 2 }),
    ],
    [{ ...SPRINT_3, goal: 'Users can sign up and log in' }, { ...SPRINT_4, startDate: '2026-11-16' }],
  );
}

function start(todoDb: TodoDb = boardDb()) {
  db = todoDb;
  server.use(...todoHandlers(db), ...projectHandlers());
}

afterEach(() => {
  queryClient.setQueryDefaults(qk.board('s3'), {});
});

beforeEach(() => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
});

const column = (name: RegExp | string) => screen.getByRole('region', { name });
const card = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) });
const cardsIn = (name: RegExp) =>
  within(column(name))
    .queryAllByRole('listitem')
    .map((item) => item.querySelector('[data-todo-focus]')?.querySelector('span')?.textContent);
const live = () => screen.getByTestId('live-polite');

/** Focuses a card the way a keyboard user lands on it. */
async function focusCard(title: string) {
  const button = await screen.findByRole('button', { name: new RegExp(`^${title}`) }, { timeout: 3000 });
  button.focus();
  return button;
}

describe('board helpers', () => {
  it('rebuilds columns and live stats from a flat list', () => {
    const todos = boardDb().todos.filter((todo) => todo.sprintId === 's3');
    const board: SprintBoardResponse = {
      sprint: SPRINT_3,
      columns: { todo: [], in_progress: [], in_review: [], done: [] },
    };
    const rebuilt = withBoardTodos(board, todos);
    expect(rebuilt.columns.todo.map((todo) => todo.key)).toEqual(['KAN-21', 'KAN-22']);
    expect(rebuilt.sprint.stats).toEqual(sprintStatsOf(todos));
    expect(rebuilt.sprint.stats).toMatchObject({ totalTodos: 5, doneTodos: 1, totalPoints: 13, donePoints: 3 });
    expect(boardTodos(rebuilt).map((todo) => todo.key)).toEqual(['KAN-21', 'KAN-22', 'KAN-18', 'KAN-19', 'KAN-15']);
  });

  it('says how many days are left', () => {
    expect(daysRemaining('2026-11-15', '2026-11-04')).toBe('11 days left');
    expect(daysRemaining('2026-11-05', '2026-11-04')).toBe('1 day left');
    expect(daysRemaining('2026-11-04', '2026-11-04')).toBe('Ends today');
    expect(daysRemaining('2026-11-02', '2026-11-04')).toBe('Ended 2 days ago');
    expect(daysRemaining(null)).toBeNull();
  });
});

describe('active sprint board (SPR-4)', () => {
  it('shows the header, progress and four columns with counts, points and cards', async () => {
    start();
    renderApp('/projects/p1/board');

    expect(await screen.findByRole('heading', { name: 'Sprint 3', level: 2 }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Active Sprint', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Nov 2 – Nov 15/)).toBeInTheDocument();
    expect(screen.getByText(/Users can sign up and log in/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Sprint 3 points done' })).toHaveAttribute(
      'aria-valuetext',
      '3 of 13 points done',
    );
    expect(screen.getByRole('progressbar', { name: 'Sprint 3 todos done' })).toHaveAttribute(
      'aria-valuetext',
      '1 of 5 todos done',
    );
    expect(screen.getByRole('button', { name: 'Complete sprint' })).toBeInTheDocument();

    expect(column('To Do, 2 todos')).toBeInTheDocument();
    expect(column('In Progress, 1 todo')).toBeInTheDocument();
    expect(column('In Review, 1 todo')).toBeInTheDocument();
    expect(column('Done, 1 todo')).toBeInTheDocument();
    expect(within(column(/^To Do/)).getByText('5 pts')).toBeInTheDocument();
    expect(cardsIn(/^To Do/)).toEqual(['Validate signup form', 'Board filters']);

    // Card: title, type, priority, overdue and labels, key, points.
    const dragCard = card('Drag cards between columns');
    expect(dragCard).toHaveTextContent('Story');
    expect(dragCard).toHaveTextContent('High');
    expect(dragCard).toHaveTextContent('Overdue, due Jan 1');
    expect(dragCard).toHaveTextContent('frontend');
    expect(dragCard).toHaveTextContent('KAN-18');
    expect(dragCard).toHaveTextContent('5 story points');
    expect(within(card('Set up routing')).getByRole('img', { name: 'Done' })).toBeInTheDocument();
    // An empty column is a drop target with a hint.
    expect(screen.queryByText('Drop todos here')).not.toBeInTheDocument();

    await expectNoAxeViolations(screen.getByRole('main'));
  });

  it("asks for the board with the project's active sprint id, without waiting for the sprint list", async () => {
    start();
    server.use(
      http.get(apiUrl('/projects/:projectId/sprints'), async () => {
        await delay('infinite');
        return HttpResponse.json({ sprints: [] });
      }),
    );
    renderApp('/projects/p1/board');
    expect(await screen.findByRole('region', { name: 'To Do, 2 todos' }, { timeout: 3000 })).toBeInTheDocument();
    expect(db.calls.board).toContain('s3');
  });

  it('opens Todo details when a card is clicked', async () => {
    const user = userEvent.setup();
    start();
    const { router } = renderApp('/projects/p1/board');
    await user.click(await screen.findByRole('button', { name: /^Board filters/ }, { timeout: 3000 }));
    expect(router.state.location.search).toBe('?todo=a2');
    expect(await screen.findByRole('dialog', { name: /Board filters|KAN-22/ })).toBeInTheDocument();
  });

  it('shows the page error with Try again when the board fails to load', async () => {
    const user = userEvent.setup();
    queryClient.setQueryDefaults(qk.board('s3'), { retry: false });
    start();
    let fail = true;
    server.use(
      http.get(apiUrl('/sprints/:sprintId/todos'), () =>
        fail ? HttpResponse.json(errorBody('INTERNAL_ERROR', 'Boom'), { status: 500 }) : undefined,
      ),
    );
    renderApp('/projects/p1/board');
    expect(
      await screen.findByRole('heading', { name: "We couldn't load the active sprint" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'To Do, 2 todos' })).toBeInTheDocument();
  });
});

describe('moving cards (SPR-5)', () => {
  it('→ moves a card to the next column at the same index, keeps focus and announces it', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');

    await focusCard('Board filters');
    await user.keyboard('{ArrowRight}');

    await waitFor(() => {
      expect(cardsIn(/^In Progress/)).toEqual(['Drag cards between columns', 'Board filters']);
    });
    expect(live()).toHaveTextContent('KAN-22 moved to In Progress, position 2 of 2');
    expect(column('To Do, 1 todo')).toBeInTheDocument();
    await waitFor(() => {
      expect(card('Board filters')).toHaveFocus();
    });
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 'a2', body: { sprintId: 's3', status: 'in_progress', position: 1 } }]);
    });
    // A change of column offers Undo.
    expect(await screen.findByText('KAN-22 moved to In Progress')).toBeInTheDocument();
  });

  it('← at the first column says so instead of moving', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');

    await focusCard('Validate signup form');
    await user.keyboard('{ArrowLeft}');
    expect(live()).toHaveTextContent('KAN-21 is already in To Do');
    expect(db.calls.move).toEqual([]);
  });

  it('↑ / ↓ reorder inside the column without sending a status', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');

    await focusCard('Board filters');
    await user.keyboard('{ArrowUp}');

    await waitFor(() => {
      expect(cardsIn(/^To Do/)).toEqual(['Board filters', 'Validate signup form']);
    });
    expect(live()).toHaveTextContent('KAN-22 moved to To Do, position 1 of 2');
    await waitFor(() => {
      expect(card('Board filters')).toHaveFocus();
    });
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 'a2', body: { sprintId: 's3', position: 0 } }]);
    });

    await user.keyboard('{ArrowUp}');
    expect(live()).toHaveTextContent('KAN-22 is already at the top of To Do');
  });

  it('moves a card from its ⋯ menu, and Undo puts it back', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');

    await user.click(await screen.findByRole('button', { name: 'Actions for KAN-21' }, { timeout: 3000 }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Done' }));

    await waitFor(() => {
      expect(cardsIn(/^Done/)).toEqual(['Validate signup form', 'Set up routing']);
    });
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 'a1', body: { sprintId: 's3', status: 'done', position: 0 } }]);
    });

    await user.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(() => {
      expect(cardsIn(/^To Do/)).toEqual(['Validate signup form', 'Board filters']);
    });
    await waitFor(() => {
      expect(db.calls.move[1]).toEqual({ todoId: 'a1', body: { sprintId: 's3', status: 'todo', position: 0 } });
    });
  });

  it('updates the counts and the progress at once, before the server answers', async () => {
    const user = userEvent.setup();
    start();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(apiUrl('/todos/:todoId/move'), async () => {
        await gate;
        return HttpResponse.json(errorBody('INTERNAL_ERROR', 'Late'), { status: 500 });
      }),
    );
    renderApp('/projects/p1/board');

    await user.click(await screen.findByRole('button', { name: 'Actions for KAN-21' }, { timeout: 3000 }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Done' }));

    // The request is still waiting at the gate.
    expect(await screen.findByRole('region', { name: 'Done, 2 todos' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Sprint 3 points done' })).toHaveAttribute(
      'aria-valuetext',
      '6 of 13 points done',
    );
    expect(screen.getByRole('progressbar', { name: 'Sprint 3 todos done' })).toHaveAttribute(
      'aria-valuetext',
      '2 of 5 todos done',
    );
    release();
  });

  it('rolls the card back with an error toast when the move fails', async () => {
    const user = userEvent.setup();
    start();
    server.use(
      http.post(apiUrl('/todos/:todoId/move'), () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something broke.'), { status: 500 }),
      ),
    );
    renderApp('/projects/p1/board');

    await focusCard('Validate signup form');
    await user.keyboard('{ArrowRight}');

    expect(await screen.findByText("Couldn't move KAN-21. Something broke.")).toBeInTheDocument();
    await waitFor(() => {
      expect(cardsIn(/^To Do/)).toEqual(['Validate signup form', 'Board filters']);
    });
    expect(column('In Progress, 1 todo')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Sprint 3 points done' })).toHaveAttribute(
      'aria-valuetext',
      '3 of 13 points done',
    );
  });
});

describe('column composer', () => {
  it('adds a todo to that sprint and column, stays open, and Esc cancels', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');

    await user.click(await screen.findByRole('button', { name: 'Create todo in In Review' }, { timeout: 3000 }));
    const input = screen.getByLabelText('New todo in In Review');
    expect(input).toHaveFocus();

    await user.type(input, 'Write release notes{Enter}');
    // Optimistic: the card is there before the server answers, then takes its key.
    expect(await within(column(/^In Review/)).findByText('Write release notes')).toBeInTheDocument();
    expect(await within(column(/^In Review/)).findByText('KAN-40')).toBeInTheDocument();
    expect(db.calls.create).toEqual([{ title: 'Write release notes', sprintId: 's3', status: 'in_review' }]);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(column('In Review, 2 todos')).toBeInTheDocument();

    // Shift+Enter is a new line, not a submit.
    await user.type(input, 'Draft{Shift>}{Enter}{/Shift}');
    expect(db.calls.create).toHaveLength(1);

    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('New todo in In Review')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create todo in In Review' })).toHaveFocus();
    });
  });
});

describe('no active sprint (SPR-4)', () => {
  it('offers the backlog and starting the next planned sprint', async () => {
    const user = userEvent.setup();
    db = makeTodoDb(
      [makeTodo({ id: 'q1', key: 'PORT-1', title: 'Planned work', projectId: 'p2', sprintId: 's4', storyPoints: 2 })],
      [{ ...SPRINT_4, projectId: 'p2' }],
    );
    // The project reports the active sprint the fake server has, so it follows the start.
    server.use(
      http.get(apiUrl('/projects/p2'), () => {
        const active = db.sprints.find((sprint) => sprint.status === 'active');
        return HttpResponse.json({
          project: makeProject({
            ...PORTFOLIO,
            stats: { ...PORTFOLIO.stats, activeSprint: active ? { id: active.id, name: active.name } : null },
          }),
        });
      }),
      ...todoHandlers(db),
      ...projectHandlers([KANBOT, PORTFOLIO]),
    );
    renderApp('/projects/p2/board');

    expect(await screen.findByRole('heading', { name: 'No active sprint' }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Backlog' })).toHaveAttribute('href', '/projects/p2/backlog');
    expect(screen.queryByRole('button', { name: 'Complete sprint' })).not.toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: 'Start Sprint 4' }));
    const dialog = await screen.findByRole('dialog', { name: 'Start Sprint 4' });
    expect(within(dialog).getByText(/1 todo · 2 pts/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Start sprint' }));

    expect(await screen.findByText('Sprint 4 started')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Sprint 4', level: 2 })).toBeInTheDocument();
    expect(column('To Do, 1 todo')).toBeInTheDocument();
  });

  it('has no Start button when nothing is planned', async () => {
    db = makeTodoDb([], []);
    server.use(...todoHandlers(db), ...projectHandlers());
    renderApp('/projects/p2/board');
    expect(await screen.findByRole('heading', { name: 'No active sprint' }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Start/ })).not.toBeInTheDocument();
  });
});

describe('complete sprint (SPR-6)', () => {
  it('moves unfinished todos to the backlog by default, then shows the sprint in the history', async () => {
    const user = userEvent.setup();
    start();
    const { router } = renderApp('/projects/p1/board');

    await user.click(await screen.findByRole('button', { name: 'Complete sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Complete Sprint 3' });
    expect(dialog).toHaveAccessibleDescription(/1 todo done · 4 unfinished/);
    expect(within(dialog).getByText('3 of 13 story points completed.')).toBeInTheDocument();
    const backlog = within(dialog).getByRole('radio', { name: 'Backlog' });
    expect(backlog).toBeChecked();
    expect(backlog).toHaveFocus();
    expect(within(dialog).getByRole('radio', { name: /Sprint 4/ })).not.toBeChecked();
    expect(within(dialog).getByText('· planned, starts Nov 16')).toBeInTheDocument();
    await expectNoAxeViolations(dialog);

    await user.click(within(dialog).getByRole('button', { name: 'Complete sprint' }));

    expect(await screen.findByText('Sprint 3 completed · 4 todos moved to the backlog')).toBeInTheDocument();
    expect(db.calls.completeSprint).toEqual([{ sprintId: 's3', body: { moveUnfinishedTo: 'backlog' } }]);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/sprints/s3');
    });
    const detail = await screen.findByRole('region', { name: 'Sprint 3' });
    expect(await within(detail).findByText('Carried over')).toBeInTheDocument();
    expect(within(detail).getByText('Carried over').parentElement).toHaveTextContent('4 todos');
    const list = screen.getByRole('navigation', { name: 'All sprints' });
    expect(within(list).getByRole('link', { current: 'page' })).toHaveTextContent(/Sprint 3.*Completed/);
    const backlogOnServer = db.todos.filter((todo) => todo.sprintId === null).sort((a, b) => a.order - b.order);
    expect(backlogOnServer.map((todo) => todo.key)).toEqual([
      'KAN-31',
      'KAN-21',
      'KAN-22',
      'KAN-18',
      'KAN-19',
    ]);
  });

  it('can move them to a planned sprint instead', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');

    await user.click(await screen.findByRole('button', { name: 'Complete sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Complete Sprint 3' });
    await user.click(within(dialog).getByRole('radio', { name: /Sprint 4/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Complete sprint' }));

    expect(await screen.findByText('Sprint 3 completed · 4 todos moved to Sprint 4')).toBeInTheDocument();
    expect(db.calls.completeSprint).toEqual([{ sprintId: 's3', body: { moveUnfinishedTo: 's4' } }]);
    expect(db.todos.filter((todo) => todo.sprintId === 's4')).toHaveLength(5);
  });

  it('keeps the dialog open with the server message when completing fails', async () => {
    const user = userEvent.setup();
    start();
    server.use(
      http.post(apiUrl('/sprints/:sprintId/complete'), () =>
        HttpResponse.json(errorBody('CONFLICT', 'Only the active sprint can be completed.'), { status: 409 }),
      ),
    );
    renderApp('/projects/p1/board');

    await user.click(await screen.findByRole('button', { name: 'Complete sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Complete Sprint 3' });
    await user.click(within(dialog).getByRole('button', { name: 'Complete sprint' }));
    expect(await within(dialog).findByText('Only the active sprint can be completed.')).toBeInTheDocument();
  });
});
