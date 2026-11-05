import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { useShortcuts } from '@/stores/shortcuts';
import { projectHandlers } from '@/test/projects';
import { preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodoDb, todoHandlers } from '@/test/todos';

beforeAll(preloadPages, 30_000);

beforeEach(() => {
  useShortcuts.setState({ helpOpen: false });
  useSession.setState({ token: 'test.jwt.token' });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...todoHandlers(makeTodoDb()),
    ...projectHandlers(),
  );
});

const backlogReady = () => screen.findByRole('textbox', { name: 'Create todo' }, { timeout: 3000 });

describe('keyboard shortcuts (Requirements §9)', () => {
  it('? opens the help dialog listing every shortcut', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');
    await backlogReady();

    await user.keyboard('?');

    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toHaveTextContent('Go to the Active Sprint board');
    expect(dialog).toHaveTextContent('Search the backlog or your projects');
  });

  it('g b, g s and g k go to the board, sprints and backlog of the current project', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');
    await backlogReady();

    await user.keyboard('gb');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/board');
    });
    await user.keyboard('gs');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/sprints');
    });
    await user.keyboard('gk');
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/backlog');
    });
  });

  it('/ focuses the search and c focuses quick create', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');
    const quickCreate = await backlogReady();

    await user.keyboard('/');
    expect(screen.getByRole('searchbox', { name: 'Search todos' })).toHaveFocus();

    await user.click(document.body);
    await user.keyboard('c');
    expect(quickCreate).toHaveFocus();
  });

  it('c on another project page opens the backlog with quick create focused', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/sprints');
    await screen.findByRole('heading', { name: 'Sprints', level: 1 });

    await user.keyboard('c');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/projects/p1/backlog');
    });
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Create todo' })).toHaveFocus();
    });
  });

  it('never fires while typing in a field, or while a dialog is open', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');
    await backlogReady();

    const search = screen.getByRole('searchbox', { name: 'Search todos' });
    await user.click(search);
    await user.keyboard('gb?c');
    expect(search).toHaveValue('gb?c');
    expect(router.state.location.pathname).toBe('/projects/p1/backlog');
    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();

    await user.click(document.body);
    await user.keyboard('?');
    await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    await user.keyboard('gb');
    expect(router.state.location.pathname).toBe('/projects/p1/backlog');
  });

  it('ignores keys held with Ctrl or ⌘', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');
    await backlogReady();

    await user.keyboard('{Control>}g{/Control}{Control>}b{/Control}');
    expect(router.state.location.pathname).toBe('/projects/p1/backlog');
  });
});
