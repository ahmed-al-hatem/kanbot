import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { qk } from '@/hooks/queryKeys';
import { useSession } from '@/stores/session';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodoDb, todoHandlers, type TodoDb } from '@/test/todos';

let db: TodoDb;

beforeAll(preloadPages, 30_000);

beforeEach(() => {
  db = makeTodoDb();
  useSession.setState({ token: 'test.jwt.token' });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    // First match wins inside one `use`: these before the empty lists of projectHandlers.
    ...todoHandlers(db),
    ...projectHandlers(),
  );
});

const group = (name: string) => screen.getByRole('region', { name });
const quickCreate = () => screen.getByRole('textbox', { name: 'Create todo' });

describe('backlog list (BL-1)', () => {
  it('shows the active sprint, planned sprints and the backlog with counts, points and rows', async () => {
    renderApp('/projects/p1/backlog');

    expect(
      await screen.findByRole('heading', { name: 'Sprint 3', level: 2 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(['Sprint 3', 'Sprint 4', 'Backlog']);

    // Header: every open todo and its points.
    expect(screen.getByText('4 todos · 10 pts')).toBeInTheDocument();
    expect(within(group('Sprint 3')).getByText('Active')).toBeInTheDocument();
    expect(
      within(group('Sprint 3')).getByText('Nov 2 – Nov 15 · 1 todo · 5 pts'),
    ).toBeInTheDocument();
    expect(within(group('Sprint 4')).getByText('Planned')).toBeInTheDocument();
    expect(
      within(group('Sprint 4')).getByText('Drag todos here to plan Sprint 4'),
    ).toBeInTheDocument();
    expect(within(group('Backlog')).getByText('3 todos · 5 pts')).toBeInTheDocument();

    const row = screen.getByRole('button', { name: 'Login screen' }).closest('li')!;
    const cells = within(row);
    expect(cells.getByText('KAN-31')).toBeInTheDocument();
    expect(cells.getByRole('img', { name: 'Task' })).toBeInTheDocument();
    expect(cells.getByText('Medium')).toBeInTheDocument();
    expect(cells.getByText('3 story points')).toBeInTheDocument();
    expect(cells.getByText('auth')).toBeInTheDocument();
    expect(cells.getByText('+1')).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: 'Fix crash on save' }).closest('li')!).getByText(
        'Urgent',
      ),
    ).toBeInTheDocument();

    // One request for all todos, split client-side (plan §5.3).
    expect(db.calls.list).toBe(1);
  });

  it('collapses a group from its chevron', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    const toggle = await screen.findByRole('button', { name: 'Toggle Sprint 3' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: 'Drag and drop on the board' }),
    ).not.toBeInTheDocument();
  });

  it('shows "Your backlog is empty"; Create todo focuses quick create', async () => {
    const user = userEvent.setup();
    db.todos = db.todos.filter((todo) => todo.sprintId !== null);
    renderApp('/projects/p1/backlog');

    expect(
      await screen.findByRole('heading', { name: 'Your backlog is empty' }),
    ).toBeInTheDocument();
    // The page header's and the empty state's.
    expect(screen.getAllByRole('button', { name: 'Generate todos' })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Create todo' }));
    expect(quickCreate()).toHaveFocus();
  });

  it('shows the page error and loads again with Try again', async () => {
    const user = userEvent.setup();
    queryClient.setQueryDefaults(qk.todos('p1'), { retry: false });
    try {
      server.use(
        http.get(apiUrl('/projects/:projectId/todos'), () =>
          HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 }),
        ),
      );
      renderApp('/projects/p1/backlog');

      expect(
        await screen.findByRole('heading', { name: "We couldn't load the backlog" }),
      ).toBeInTheDocument();
      server.use(...todoHandlers(db));
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByRole('button', { name: 'Login screen' })).toBeInTheDocument();
    } finally {
      queryClient.setQueryDefaults(qk.todos('p1'), {});
    }
  });
});

describe('quick create (BL-2)', () => {
  it('Enter creates a task at once, keeps focus for the next one, then shows the server key', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/projects/:projectId/todos'), async ({ request }) => {
        await delay(300);
        const body = (await request.json()) as { title: string };
        db.calls.create.push(body);
        const todo = {
          ...db.todos[1]!,
          id: 'new-40',
          key: 'KAN-40',
          title: body.title,
          labels: [],
          storyPoints: null,
        };
        db.todos.push(todo);
        return HttpResponse.json({ todo }, { status: 201 });
      }),
    );
    renderApp('/projects/p1/backlog');

    const input = await waitFor(quickCreate);
    await user.click(input);
    await user.type(input, 'Write the backlog tests{Enter}');

    // Optimistic: the row is there before the server answers, still saving.
    const backlog = within(group('Backlog'));
    expect(backlog.getByText('Write the backlog tests')).toBeInTheDocument();
    expect(backlog.getByText('Saving')).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    expect(await backlog.findByText('KAN-40', {}, { timeout: 2000 })).toBeInTheDocument();
    expect(db.calls.create).toEqual([{ title: 'Write the backlog tests' }]);
    expect(input).toHaveFocus();
  });

  it('Esc cancels the typed title and sends nothing', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    const input = await waitFor(quickCreate);
    await user.click(input);
    await user.type(input, 'Never mind');
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(db.calls.create).toEqual([]);
  });

  it('removes the row and gives the title back when the create fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/projects/:projectId/todos'), () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 }),
      ),
    );
    renderApp('/projects/p1/backlog');

    const input = await waitFor(quickCreate);
    await user.click(input);
    await user.type(input, 'Doomed todo{Enter}');

    expect(
      await screen.findByText("Couldn't create “Doomed todo”. Something went wrong"),
    ).toBeInTheDocument();
    expect(within(group('Backlog')).queryByText('Doomed todo')).not.toBeInTheDocument();
    expect(input).toHaveValue('Doomed todo');
  });
});

describe('search and filters (BL-6)', () => {
  it('filters locally with the search in the URL, "Showing X of Y" and per-group messages', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');

    await user.type(await screen.findByRole('searchbox', { name: 'Search todos' }), 'login');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?q=login');
    });
    // The rows follow the URL through useDeferredValue, a render later.
    expect(await screen.findByText('Showing 1 of 4', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login screen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fix crash on save' })).not.toBeInTheDocument();
    expect(
      within(group('Sprint 3')).getByText('No todos in Sprint 3 match your filters'),
    ).toBeInTheDocument();
    // Filtering runs over the cached list: no request per keystroke.
    expect(db.calls.list).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search todos' })).toHaveValue('');
    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(await screen.findByRole('button', { name: 'Fix crash on save' })).toBeInTheDocument();
  });

  it('matches description and labels, and filters by priority and type in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');

    const search = await screen.findByRole('searchbox', { name: 'Search todos' });
    // Each step waits for the URL first: a search that is still being debounced must not
    // count as done.
    const searchIs = async (q: string) => {
      await waitFor(() => {
        expect(router.state.location.search).toBe(q);
      });
    };

    await user.type(search, 'crashes');
    await searchIs('?q=crashes');
    expect(await screen.findByText('Showing 1 of 4', {}, { timeout: 3000 })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'frontend');
    await searchIs('?q=frontend');
    expect(await screen.findByText('Showing 2 of 4')).toBeInTheDocument();
    expect(search).toHaveValue('frontend');
    await user.clear(search);
    await searchIs('');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filter by priority' }),
      'urgent',
    );
    await searchIs('?priority=urgent');
    expect(await screen.findByText('Showing 1 of 4', {}, { timeout: 3000 })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by type' }), 'story');
    await searchIs('?priority=urgent&type=story');
    expect(await screen.findByText('Showing 0 of 4')).toBeInTheDocument();
    expect(
      within(group('Backlog')).getByText('No todos in Backlog match your filters'),
    ).toBeInTheDocument();
  });

  it('reads the filters from the URL on load', async () => {
    renderApp('/projects/p1/backlog?type=bug');

    expect(await screen.findByText('Showing 1 of 4', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by type' })).toHaveValue('bug');
    expect(screen.getByRole('button', { name: 'Fix crash on save' })).toBeInTheDocument();
  });
});

describe('delete from the row menu (BL-4)', () => {
  it('confirms, removes the row at once with a toast, and moves focus to the next row', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Actions for KAN-31' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const confirm = await screen.findByRole('alertdialog', { name: 'Delete KAN-31?' });
    expect(confirm).toHaveTextContent('“Login screen”');
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(confirm).getByRole('button', { name: 'Delete todo' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Login screen' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('KAN-31 deleted')).toBeInTheDocument();
    expect(db.calls.remove).toEqual(['t2']);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fix crash on save' })).toHaveFocus();
    });
  });

  it('puts the row back with an error toast when the delete fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(apiUrl('/todos/:todoId'), async () => {
        await delay(100);
        return HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), {
          status: 500,
        });
      }),
    );
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Actions for KAN-31' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete todo' }),
    );

    // Gone while the request runs (optimistic)…
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Login screen' })).not.toBeInTheDocument();
    });
    // …and back when it fails.
    expect(
      await screen.findByText("Couldn't delete KAN-31. Something went wrong"),
    ).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Login screen' })).toBeInTheDocument();
  });

  it('opens Todo details from the row title, with the todo id in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Login screen' }));
    expect(await screen.findByRole('dialog', { name: 'KAN-31' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?todo=t2');
  });
});
