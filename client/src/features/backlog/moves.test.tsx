import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodoDb, serverMove, todoHandlers, type TodoDb } from '@/test/todos';
import type { MoveTodoRequest } from '@/types/api';
import { DRAG_OFF_TEXT } from './useBacklogMoves';

let db: TodoDb;

beforeAll(preloadPages, 30_000);

beforeEach(() => {
  db = makeTodoDb();
  useSession.setState({ token: 'test.jwt.token' });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...todoHandlers(db),
    ...projectHandlers(),
  );
});

const group = (name: string) => screen.getByRole('region', { name });
const titlesIn = (name: string) =>
  within(group(name))
    .queryAllByRole('listitem')
    .map((row) => row.querySelector('[data-todo-focus]')?.textContent);
const live = () => screen.getByTestId('live-polite');
const backlogOrderOnServer = () =>
  db.todos
    .filter((todo) => todo.sprintId === null)
    .sort((a, b) => a.order - b.order)
    .map((todo) => todo.key);

/** Focuses a row title the way a keyboard user would land on it. */
async function focusTitle(title: string) {
  // The first render of a file can be slow (cold transforms); give the list time to load.
  const button = await screen.findByRole('button', { name: title }, { timeout: 3000 });
  button.focus();
  return button;
}

describe('keyboard moves (BL-5, DESIGN §10.1)', () => {
  it('↓ reorders inside the Backlog, keeps focus on the row and announces the move', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    await focusTitle('Login screen');
    await user.keyboard('{ArrowDown}');

    // Optimistic: the order changes before the server answers.
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Fix crash on save', 'Login screen', 'Sprint summary']);
    });
    expect(live()).toHaveTextContent('KAN-31 moved to Backlog, position 2 of 3');
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 't2', body: { sprintId: null, position: 1 } }]);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login screen' })).toHaveFocus();
    });
    expect(backlogOrderOnServer()).toEqual(['KAN-32', 'KAN-31', 'KAN-33']);
  });

  it('↑ at the top of a group moves into the previous group, announces it and offers Undo', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    await focusTitle('Login screen');
    await user.keyboard('{ArrowUp}');

    // Backlog → the planned Sprint 4 just above it.
    expect(await within(group('Sprint 4')).findByRole('button', { name: 'Login screen' })).toBeInTheDocument();
    expect(live()).toHaveTextContent('KAN-31 moved to Sprint 4, position 1 of 1');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login screen' })).toHaveFocus();
    });
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 't2', body: { sprintId: 's4', position: 0 } }]);
    });

    expect(await screen.findByText('KAN-31 moved to Sprint 4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    // Back where it was: top of the Backlog.
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Login screen', 'Fix crash on save', 'Sprint summary']);
    });
    expect(await screen.findByText('KAN-31 moved back to Backlog')).toBeInTheDocument();
    await waitFor(() => {
      expect(db.calls.move[1]).toEqual({ todoId: 't2', body: { sprintId: null, position: 0 } });
    });
    expect(backlogOrderOnServer()).toEqual(['KAN-31', 'KAN-32', 'KAN-33']);
  });

  it('↓ from the active sprint leaves it for the next group', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    await focusTitle('Drag and drop on the board');
    await user.keyboard('{ArrowDown}');

    expect(await within(group('Sprint 4')).findByRole('button', { name: 'Drag and drop on the board' })).toBeInTheDocument();
    expect(live()).toHaveTextContent('KAN-28 moved to Sprint 4, position 1 of 1');
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 't1', body: { sprintId: 's4', position: 0 } }]);
    });
  });

  it('two quick moves reach the server one after the other, in order', async () => {
    const user = userEvent.setup();
    let inFlight = 0;
    let maxInFlight = 0;
    server.use(
      http.post(apiUrl('/todos/:todoId/move'), async ({ params, request }) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        const body = (await request.json()) as MoveTodoRequest;
        await delay(150);
        const todo = db.todos.find((item) => item.id === params.todoId)!;
        db.calls.move.push({ todoId: todo.id, body });
        serverMove(db, todo, { sprintId: body.sprintId ?? null, status: todo.status, position: body.position });
        inFlight -= 1;
        return HttpResponse.json({ todo });
      }),
    );
    renderApp('/projects/p1/backlog');

    await focusTitle('Login screen');
    await user.keyboard('{ArrowDown}');
    // Focus stays on the moved row, so the next ↓ moves it again — long before the first answer.
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Fix crash on save', 'Login screen', 'Sprint summary']);
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Login screen' })).toHaveFocus();
    });
    expect(db.calls.move).toEqual([]);
    await user.keyboard('{ArrowDown}');

    // Both moves show at once…
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Fix crash on save', 'Sprint summary', 'Login screen']);
    });
    // …but the requests run one at a time, in the order they were made.
    await waitFor(() => {
      expect(db.calls.move.map((call) => call.body.position)).toEqual([1, 2]);
    });
    expect(maxInFlight).toBe(1);
    expect(backlogOrderOnServer()).toEqual(['KAN-32', 'KAN-33', 'KAN-31']);
    // The lists refetch once the last move settles, and the order holds.
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Fix crash on save', 'Sprint summary', 'Login screen']);
    });
  });

  it('rolls the move back with an error toast when the request fails (500)', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/todos/:todoId/move'), async () => {
        await delay(100);
        return HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 });
      }),
    );
    renderApp('/projects/p1/backlog');

    await focusTitle('Login screen');
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Fix crash on save', 'Login screen', 'Sprint summary']);
    });

    expect(await screen.findByText("Couldn't move KAN-31. Something went wrong")).toBeInTheDocument();
    expect(titlesIn('Backlog')).toEqual(['Login screen', 'Fix crash on save', 'Sprint summary']);
  });
});

describe('row menu moves (BL-5, BL-7)', () => {
  it('Move to top / bottom reorder the Backlog', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Actions for KAN-33' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to top' }));
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Sprint summary', 'Login screen', 'Fix crash on save']);
    });

    await user.click(screen.getByRole('button', { name: 'Actions for KAN-31' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to bottom' }));
    await waitFor(() => {
      expect(titlesIn('Backlog')).toEqual(['Sprint summary', 'Fix crash on save', 'Login screen']);
    });
    await waitFor(() => {
      expect(db.calls.move.map((call) => call.body)).toEqual([
        { sprintId: null, position: 0 },
        { sprintId: null, position: 2 },
      ]);
    });
  });

  it('moves to any planned or active sprint and back to the Backlog', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Actions for KAN-32' }));
    const menu = await screen.findByRole('menu', { name: 'KAN-32 actions' });
    // Every other group; not its own.
    expect(within(menu).getByRole('menuitem', { name: 'Move to Sprint 3' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Move to Sprint 4' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Move to Backlog' })).not.toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: 'Move to Sprint 3' }));

    await waitFor(() => {
      expect(within(group('Sprint 3')).getByRole('button', { name: 'Fix crash on save' })).toBeInTheDocument();
    });
    expect(await screen.findByText('KAN-32 moved to Sprint 3')).toBeInTheDocument();
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 't3', body: { sprintId: 's3', position: 0 } }]);
    });

    // In the active sprint the row has no top / bottom (its order is the board's), but can go back.
    await user.click(screen.getByRole('button', { name: 'Actions for KAN-32' }));
    const again = await screen.findByRole('menu', { name: 'KAN-32 actions' });
    expect(within(again).queryByRole('menuitem', { name: 'Move to top' })).not.toBeInTheDocument();
    await user.click(within(again).getByRole('menuitem', { name: 'Move to Backlog' }));
    await waitFor(() => {
      expect(within(group('Backlog')).getByRole('button', { name: 'Fix crash on save' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(db.calls.move[1]).toEqual({ todoId: 't3', body: { sprintId: null, position: 0 } });
    });
  });
});

describe('while filtering (BL-6)', () => {
  it('turns drag and ↑/↓ off with a visible reason; the menu still moves', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog?q=login');

    expect(await screen.findByText(DRAG_OFF_TEXT)).toBeInTheDocument();
    const handle = screen.getByRole('button', { name: 'Drag KAN-31' });
    expect(handle).toBeDisabled();
    expect(handle).toHaveAccessibleDescription(DRAG_OFF_TEXT);

    await focusTitle('Login screen');
    await user.keyboard('{ArrowDown}');
    expect(live()).toHaveTextContent(DRAG_OFF_TEXT);
    expect(db.calls.move).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Actions for KAN-31' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Sprint 4' }));
    await waitFor(() => {
      expect(db.calls.move).toEqual([{ todoId: 't2', body: { sprintId: 's4', position: 0 } }]);
    });
  });

  it('shows an empty planned sprint as a drop target when not filtering', async () => {
    renderApp('/projects/p1/backlog');
    expect(await screen.findByText('Drag todos here to plan Sprint 4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drag KAN-31' })).toBeEnabled();
  });
});
