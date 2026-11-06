import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getFormat, getT } from '@/i18n';
import { addDays, todayIso } from '@/lib/dates';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { projectHandlers } from '@/test/projects';
import { preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import {
  makeSprint,
  makeTodoDb,
  seedTodos,
  SPRINT_3,
  SPRINT_4,
  todoHandlers,
  type TodoDb,
} from '@/test/todos';
import { createDefaults, durationHint, nextSprintName } from './sprintForm';

let db: TodoDb;

beforeAll(preloadPages, 30_000);

function start(todoDb: TodoDb) {
  db = todoDb;
  server.use(...todoHandlers(db), ...projectHandlers());
}

beforeEach(() => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
});

const group = (name: string) => screen.getByRole('region', { name });

describe('sprint form defaults (SPR-1, DESIGN §9 13)', () => {
  it('names the next sprint after the highest "Sprint N" and the count', () => {
    expect(nextSprintName([])).toBe('Sprint 1');
    expect(nextSprintName([{ name: 'Sprint 3' }, { name: 'Sprint 4' }])).toBe('Sprint 5');
    expect(nextSprintName([{ name: 'Sprint 7' }, { name: 'Auth' }])).toBe('Sprint 8');
    expect(nextSprintName([{ name: 'Auth' }, { name: 'Polish' }])).toBe('Sprint 3');
  });

  it('starts the day after the last sprint ends and lasts two weeks', () => {
    expect(createDefaults([SPRINT_3, SPRINT_4], '2026-11-04')).toEqual({
      name: 'Sprint 5',
      goal: '',
      startDate: '2026-11-16',
      endDate: '2026-11-30',
    });
    // No dates anywhere: today.
    expect(createDefaults([SPRINT_4], '2026-11-04').startDate).toBe('2026-11-04');
    expect(durationHint('2026-11-16', '2026-11-30', getFormat(), getT())).toBe(
      '2 weeks · Nov 16 – Nov 30',
    );
    expect(durationHint('2026-11-16', '2026-11-26', getFormat(), getT())).toBe(
      '10 days · Nov 16 – Nov 26',
    );
    expect(durationHint('2026-11-16', '2026-11-10', getFormat(), getT())).toBeNull();
  });
});

describe('create and edit a sprint (SPR-1, SPR-2)', () => {
  it('opens with the defaults and creates a planned sprint', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Create sprint' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create sprint' });
    const name = within(dialog).getByLabelText(/Sprint name/);
    expect(name).toHaveValue('Sprint 5');
    expect(name).toHaveFocus();
    expect(within(dialog).getByLabelText('Start date')).toHaveValue('2026-11-16');
    expect(within(dialog).getByLabelText('End date')).toHaveValue('2026-11-30');
    expect(within(dialog).getByText('2 weeks · Nov 16 – Nov 30')).toBeInTheDocument();
    await expectNoAxeViolations(dialog);

    await user.type(within(dialog).getByLabelText('Sprint goal'), 'Ship drag and drop');
    await user.click(within(dialog).getByRole('button', { name: 'Create sprint' }));

    expect(await screen.findByText('Sprint 5 created · drag todos into it')).toBeInTheDocument();
    expect(db.calls.createSprint).toEqual([
      {
        name: 'Sprint 5',
        goal: 'Ship drag and drop',
        startDate: '2026-11-16',
        endDate: '2026-11-30',
      },
    ]);
    expect(await screen.findByRole('heading', { name: 'Sprint 5', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves the end with the start, and rejects an end before the start', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Create sprint' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create sprint' });
    const startDate = within(dialog).getByLabelText('Start date');
    const endDate = within(dialog).getByLabelText('End date');

    fireEvent.change(startDate, { target: { value: '2026-12-01' } });
    expect(endDate).toHaveValue('2026-12-15');

    fireEvent.change(endDate, { target: { value: '2026-11-20' } });
    fireEvent.blur(endDate);
    expect(
      await within(dialog).findByText('End date must be after start date'),
    ).toBeInTheDocument();
    expect(endDate).toHaveAttribute('aria-invalid', 'true');

    await user.click(within(dialog).getByRole('button', { name: 'Create sprint' }));
    expect(db.calls.createSprint).toEqual([]);

    // The same day is allowed (the API only rejects an end before the start).
    fireEvent.change(endDate, { target: { value: '2026-12-01' } });
    await waitFor(() => {
      expect(
        within(dialog).queryByText('End date must be after start date'),
      ).not.toBeInTheDocument();
    });
  });

  it('edits a sprint from its ⋯ menu and sends only what changed', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Actions for Sprint 4' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit sprint' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit Sprint 4' });
    const name = within(dialog).getByLabelText(/Sprint name/);
    await user.clear(name);
    await user.type(name, 'Polish');
    await user.click(within(dialog).getByRole('button', { name: 'Save sprint' }));

    expect(await screen.findByText('Polish saved')).toBeInTheDocument();
    expect(db.calls.updateSprint).toEqual([{ sprintId: 's4', body: { name: 'Polish' } }]);
    expect(await screen.findByRole('heading', { name: 'Polish', level: 2 })).toBeInTheDocument();
  });
});

describe('delete a planned sprint (SPR-2)', () => {
  it('confirms, then its todos go back to the backlog', async () => {
    const user = userEvent.setup();
    const todos = seedTodos();
    todos[1]!.sprintId = 's4'; // Login screen is planned in Sprint 4
    start(makeTodoDb(todos));
    renderApp('/projects/p1/backlog');

    expect(
      await within(await screen.findByRole('region', { name: 'Sprint 4' })).findByRole('button', {
        name: 'Login screen',
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actions for Sprint 4' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete sprint' }));

    const confirm = await screen.findByRole('alertdialog', { name: 'Delete Sprint 4?' });
    expect(confirm).toHaveTextContent('Its 1 todo goes back to the backlog');
    await user.click(within(confirm).getByRole('button', { name: 'Delete sprint' }));

    expect(
      await screen.findByText('Sprint 4 deleted · 1 todo moved to the backlog'),
    ).toBeInTheDocument();
    expect(db.calls.deleteSprint).toEqual(['s4']);
    expect(screen.queryByRole('heading', { name: 'Sprint 4' })).not.toBeInTheDocument();
    expect(
      within(group('Backlog')).getByRole('button', { name: 'Login screen' }),
    ).toBeInTheDocument();
  });

  it("doesn't offer Delete for the active sprint, which links to the board instead", async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');

    const active = await screen.findByRole('region', { name: 'Sprint 3' });
    expect(within(active).getByRole('link', { name: 'Complete sprint' })).toHaveAttribute(
      'href',
      '/projects/p1/board',
    );
    await user.click(within(active).getByRole('button', { name: 'Actions for Sprint 3' }));
    expect(await screen.findByRole('menuitem', { name: 'Edit sprint' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Delete sprint' })).not.toBeInTheDocument();
  });
});

describe('start a sprint (SPR-3)', () => {
  it('is disabled with the reason while another sprint is active, and the click offers the board', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    const { router } = renderApp('/projects/p1/backlog');

    const button = await within(await screen.findByRole('region', { name: 'Sprint 4' })).findByRole(
      'button',
      {
        name: 'Start sprint',
      },
    );
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAccessibleDescription('Complete Sprint 3 first');

    await user.click(button);
    expect(
      await screen.findByText('Complete Sprint 3 before starting Sprint 4.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to board' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/board');
    });
  });

  it('blocks an empty sprint with a toast', async () => {
    const user = userEvent.setup();
    start(
      makeTodoDb(
        seedTodos().filter((todo) => todo.sprintId === null),
        [SPRINT_4],
      ),
    );
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Start sprint' }));
    expect(
      await screen.findByText('Add todos to Sprint 4 before starting it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog with today and +14 days, starts it and goes to the board', async () => {
    const user = userEvent.setup();
    const todos = seedTodos().filter((todo) => todo.sprintId === null);
    todos[0]!.sprintId = 's5';
    start(makeTodoDb(todos, [makeSprint({ id: 's5', name: 'Sprint 5', status: 'planned' })]));
    const { router } = renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Start sprint' }));
    const dialog = await screen.findByRole('dialog', { name: 'Start Sprint 5' });
    const today = todayIso();
    expect(within(dialog).getByLabelText(/Start date/)).toHaveValue(today);
    expect(within(dialog).getByLabelText(/End date/)).toHaveValue(addDays(today, 14));
    expect(dialog).toHaveTextContent('1 todo · 3 pts');
    await user.click(within(dialog).getByRole('button', { name: 'Start sprint' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/board');
    });
    expect(db.calls.startSprint).toEqual([
      { sprintId: 's5', body: { startDate: today, endDate: addDays(today, 14) } },
    ]);
    expect(await screen.findByText('Sprint 5 started')).toBeInTheDocument();
  });
});
