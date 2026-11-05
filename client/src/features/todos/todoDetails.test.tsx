import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
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

const dialog = (name = 'KAN-31') => screen.findByRole('dialog', { name });
const titleField = () => screen.getByRole('textbox', { name: /^Title/ });

describe('Todo details (BL-3)', () => {
  it('opens from a deep link with every field, fetching the todo when the list is not cached', async () => {
    // The list is slow, so the dialog can't be seeded from it and asks GET /todos/:id.
    server.use(
      http.get(apiUrl('/projects/:projectId/todos'), async () => {
        await delay(800);
        return HttpResponse.json({ todos: db.todos });
      }),
    );
    renderApp('/projects/p1/backlog?todo=t2');

    const panel = await dialog();
    const details = within(panel);
    expect(await details.findByRole('textbox', { name: /^Title/ })).toHaveValue('Login screen');
    expect(db.calls.get).toBe(1);
    expect(details.getByRole('textbox', { name: 'Description' })).toHaveValue('');
    expect(details.getByRole('combobox', { name: 'Sprint' })).toHaveValue('backlog');
    expect(details.getByRole('combobox', { name: 'Priority' })).toHaveValue('medium');
    expect(details.getByRole('combobox', { name: 'Type' })).toHaveValue('task');
    expect(details.getByRole('combobox', { name: 'Story points' })).toHaveValue('3');
    expect(details.getByRole('button', { name: 'Remove label auth' })).toBeInTheDocument();
    expect(details.getByLabelText('Due date')).toHaveValue('');
    // No assignee or reporter (plan §2 #4).
    expect(details.queryByText(/assignee|reporter/i)).not.toBeInTheDocument();
    // Title gets focus on open (DESIGN §10.3).
    expect(titleField()).toHaveFocus();
    await expectNoAxeViolations(panel);
  });

  it('enables Status only in the active sprint', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    const status = await details.findByRole('combobox', { name: 'Status' });
    expect(status).toBeDisabled();
    expect(status).toHaveAccessibleDescription('Move it into the active sprint to set a status');

    await user.selectOptions(details.getByRole('combobox', { name: 'Sprint' }), 's3');
    expect(status).toBeEnabled();
    expect(details.getByRole('option', { name: 'Sprint 3 (active)' })).toBeInTheDocument();
    expect(details.getByRole('option', { name: 'Sprint 4 (planned)' })).toBeInTheDocument();
  });

  it('shows "Overdue by N days" for a past due date', async () => {
    db.todos[1]!.dueDate = '2020-01-01';
    renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    expect(await details.findByText(/^Overdue by \d+ days$/)).toBeInTheDocument();
  });

  it('saves only the changed fields, toasts and closes', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Login screen' }));
    const details = within(await dialog());
    await user.selectOptions(details.getByRole('combobox', { name: 'Priority' }), 'high');
    await user.selectOptions(details.getByRole('combobox', { name: 'Story points' }), '');
    await user.type(details.getByRole('textbox', { name: 'Labels' }), 'api{Enter}');
    expect(details.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(details.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('KAN-31 saved')).toBeInTheDocument();
    expect(db.calls.update).toEqual([{ priority: 'high', storyPoints: null, labels: ['auth', 'frontend', 'forms', 'api'] }]);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(router.state.location.search).toBe('');
    expect(within(screen.getByRole('button', { name: 'Login screen' }).closest('li')!).getByText('High')).toBeInTheDocument();
    // Focus goes back to the row that opened it.
    expect(screen.getByRole('button', { name: 'Login screen' })).toHaveFocus();
  });

  it('validates the title on the client', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    await user.clear(await details.findByRole('textbox', { name: /^Title/ }));
    await user.click(details.getByRole('button', { name: 'Save changes' }));

    expect(await details.findByText('A todo needs a title')).toBeInTheDocument();
    expect(titleField()).toHaveAttribute('aria-invalid', 'true');
    expect(db.calls.update).toEqual([]);
  });

  it('puts server validation details under their fields', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(apiUrl('/todos/:todoId'), () =>
        HttpResponse.json(
          errorBody('VALIDATION_ERROR', 'title: Title is required', [
            { path: 'title', message: 'Title is required' },
            { path: 'labels.0', message: 'Labels can be 30 characters at most' },
          ]),
          { status: 400 },
        ),
      ),
    );
    renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    await user.type(await details.findByRole('textbox', { name: /^Title/ }), ' v2');
    await user.click(details.getByRole('button', { name: 'Save changes' }));

    expect(await details.findByText('Title is required')).toBeInTheDocument();
    expect(titleField()).toHaveAttribute('aria-invalid', 'true');
    expect(titleField()).toHaveFocus();
    expect(details.getByText('Labels can be 30 characters at most')).toBeInTheDocument();
    // Field errors, not the save-error bar.
    expect(details.queryByText(/Couldn't save/)).not.toBeInTheDocument();
  });

  it('keeps the edits when saving fails and saves them with Retry', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(apiUrl('/todos/:todoId'), () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 }),
      ),
    );
    renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    const title = await details.findByRole('textbox', { name: /^Title/ });
    await user.clear(title);
    await user.type(title, 'Login and register screens');
    await user.click(details.getByRole('button', { name: 'Save changes' }));

    const bar = await details.findByRole('alert');
    expect(bar).toHaveTextContent("Couldn't save KAN-31. Check your connection and try again — your edits are still here.");
    expect(title).toHaveValue('Login and register screens');

    server.use(...todoHandlers(db));
    await user.click(within(bar).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('KAN-31 saved')).toBeInTheDocument();
    expect(db.calls.update).toEqual([{ title: 'Login and register screens' }]);
  });

  it('offline, Save fails fast with the save-error bar, keeps the edits, and Retry saves once back online', async () => {
    const user = userEvent.setup();
    // No network: the request never reaches a server.
    server.use(http.patch(apiUrl('/todos/:todoId'), () => HttpResponse.error()));
    renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    await user.selectOptions(await details.findByRole('combobox', { name: 'Priority' }), 'urgent');
    act(() => {
      onlineManager.setOnline(false);
    });
    try {
      await user.click(details.getByRole('button', { name: 'Save changes' }));

      // `networkMode: 'always'`: no paused mutation and endless spinner, the error UI instead.
      const bar = await details.findByRole('alert');
      expect(bar).toHaveTextContent("Couldn't save KAN-31. Check your connection and try again — your edits are still here.");
      expect(details.getByRole('button', { name: 'Save changes' })).not.toHaveAttribute('aria-busy');
      expect(details.getByRole('combobox', { name: 'Priority' })).toHaveValue('urgent');
    } finally {
      act(() => {
        onlineManager.setOnline(true);
      });
    }

    server.use(...todoHandlers(db));
    await user.click(within(await details.findByRole('alert')).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('KAN-31 saved')).toBeInTheDocument();
    expect(db.calls.update).toEqual([{ priority: 'urgent' }]);
  });
});

describe('unsaved changes guard (BL-3)', () => {
  it('Esc shows the confirm bar with Keep editing focused; Keep editing stays, Discard closes', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    await user.type(await details.findByRole('textbox', { name: /^Title/ }), '!');
    await user.keyboard('{Escape}');

    const bar = await details.findByRole('alertdialog', { name: 'Unsaved changes' });
    expect(bar).toHaveTextContent('Discard your unsaved changes?');
    expect(within(bar).getByRole('button', { name: 'Keep editing' })).toHaveFocus();

    await user.click(within(bar).getByRole('button', { name: 'Keep editing' }));
    expect(details.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(titleField()).toHaveValue('Login screen!');

    // Cancel asks too.
    await user.click(details.getByRole('button', { name: 'Cancel' }));
    await user.click(within(await details.findByRole('alertdialog')).getByRole('button', { name: 'Discard' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(router.state.location.search).toBe('');
    expect(db.calls.update).toEqual([]);
  });

  it('closes straight away when nothing changed', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog?todo=t2');

    await dialog();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('blocks in-app navigation while dirty until the user discards', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog?todo=t2');

    const details = within(await dialog());
    await user.type(await details.findByRole('textbox', { name: /^Title/ }), '!');
    // The guard is registered on the render that shows the form as dirty; wait for it.
    expect(await details.findByText('Unsaved changes')).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/projects/p1/board');
    });
    expect(router.state.location.pathname).toBe('/projects/p1/backlog');
    const bar = await details.findByRole('alertdialog', { name: 'Unsaved changes' });

    await user.click(within(bar).getByRole('button', { name: 'Discard' }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/board');
    });
  });
});

describe('delete from Todo details (BL-4)', () => {
  it('confirms, closes the dialog, removes the row and toasts', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Login screen' }));
    const details = within(await dialog());
    await user.click(details.getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Delete KAN-31?' });
    await user.click(within(confirm).getByRole('button', { name: 'Delete todo' }));

    expect(await screen.findByText('KAN-31 deleted')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Login screen' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(db.calls.remove).toEqual(['t2']);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fix crash on save' })).toHaveFocus();
    });
  });

  it('shows the 404 page for an unknown id', async () => {
    renderApp('/projects/p1/backlog?todo=nope');

    expect(await screen.findByRole('heading', { name: "This todo doesn't exist", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.title).toBe('Page not found · Kanbot');
  });
});
