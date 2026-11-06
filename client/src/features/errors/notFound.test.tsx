import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useAssistant } from '@/stores/assistant';
import { useNotFound } from '@/stores/notFound';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { projectHandlers } from '@/test/projects';
import { preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodo, makeTodoDb, todoHandlers, type TodoDb } from '@/test/todos';

let db: TodoDb;

beforeAll(preloadPages, 30_000);

beforeEach(() => {
  db = makeTodoDb([
    ...makeTodoDb().todos,
    // Another user's or another project's todo: the API returns it, but not for this project.
    makeTodo({ id: 't9', key: 'PORT-1', title: 'Hero section', projectId: 'p2' }),
  ]);
  useNotFound.setState({ cause: null });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...todoHandlers(db),
    ...projectHandlers(),
  );
});

const signIn = () => {
  useSession.setState({ token: 'test.jwt.token' });
};
const nav = () => screen.getByRole('navigation', { name: 'Main' });
const heading = (name: string) =>
  screen.findByRole('heading', { name, level: 1 }, { timeout: 3000 });

describe('404 page (DESIGN §9 Global — 404)', () => {
  it('renders an unknown route inside the shell, with no nav item current and the page title', async () => {
    signIn();
    const { router } = renderApp('/teams/42?tab=members');

    expect(await heading("We can't find that page")).toBeInTheDocument();
    // Rendered, not redirected.
    expect(router.state.location.pathname).toBe('/teams/42');
    expect(screen.getByText('Error 404')).toBeInTheDocument();
    expect(screen.getByText(/\/teams\/42\?tab=members$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
    // No current project: no "Open Active Sprint".
    expect(screen.queryByRole('link', { name: 'Open Active Sprint' })).not.toBeInTheDocument();
    expect(within(nav()).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
    expect(document.title).toBe('Page not found · Kanbot');
    await expectNoAxeViolations(screen.getByRole('main'));
  });

  it('"Ask AI to find it" opens the drawer with the path in the composer and sends nothing', async () => {
    signIn();
    const user = userEvent.setup();
    renderApp('/projects/p1/sprints/s3/oops');

    await heading("We can't find that page");
    await user.click(await screen.findByRole('button', { name: 'Ask AI to find it' }));

    const drawer = await screen.findByRole('dialog', { name: 'Kanbot Assistant' });
    const composer = within(drawer).getByRole('textbox', { name: 'Message Kanbot' });
    expect((composer as HTMLTextAreaElement).value).toContain('/projects/p1/sprints/s3/oops');
    // The prompt waits in the composer: no chat request (MSW fails any unhandled one).
    expect(useAssistant.getState().chats.p1 ?? []).toHaveLength(0);
  });

  it('shows the missing-project variant without the project nav or Active Sprint', async () => {
    signIn();
    renderApp('/projects/gone/board');

    expect(await heading("This project doesn't exist")).toBeInTheDocument();
    expect(screen.getByText(/belongs to an account you're not signed in to/)).toBeInTheDocument();
    expect(within(nav()).queryByRole('link', { name: 'Backlog' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Active Sprint' })).not.toBeInTheDocument();
    // The AI looks in the user's most recent project instead.
    expect(await screen.findByRole('button', { name: 'Ask AI to find it' })).toBeInTheDocument();
  });

  it('shows the missing-sprint variant with Open Active Sprint for the current project', async () => {
    signIn();
    renderApp('/projects/p1/sprints/nope');

    expect(await heading("This sprint doesn't exist")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Active Sprint' })).toHaveAttribute(
      'href',
      '/projects/p1/board',
    );
    expect(within(nav()).getByRole('link', { name: 'Sprints' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows the missing-todo variant for an id the API answers 404 for', async () => {
    signIn();
    renderApp('/projects/p1/board?todo=nope');

    expect(await heading("This todo doesn't exist")).toBeInTheDocument();
    expect(
      screen.getByText('It may have been deleted. Check the backlog for similar todos.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it("treats another project's todo like a missing one", async () => {
    signIn();
    renderApp('/projects/p1/backlog?todo=t9');

    expect(await heading("This todo doesn't exist")).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('signed out: the same content centered with the logo, no shell, no AI', async () => {
    const { router } = renderApp('/nowhere');

    expect(await heading("We can't find that page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/nowhere');
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Projects' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ask AI to find it' })).not.toBeInTheDocument();
    expect(document.title).toBe('Page not found · Kanbot');
  });

  it('signed out: a known private page still goes to log in', async () => {
    const { router } = renderApp('/projects/p1/backlog');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/login');
    });
  });
});

describe('document.title per page (DESIGN §9, NFR-9)', () => {
  it('names the page and the project, and the open todo over it', async () => {
    signIn();
    const user = userEvent.setup();
    const { router } = renderApp('/projects');

    await screen.findByRole('heading', { name: 'Projects', level: 1 });
    expect(document.title).toBe('Projects · Kanbot');

    await router.navigate('/projects/p1/backlog');
    await screen.findByRole('heading', { name: 'Backlog', level: 1 });
    await waitFor(() => {
      expect(document.title).toBe('Backlog · Kanbot App · Kanbot');
    });

    await user.click(await screen.findByRole('button', { name: 'Login screen' }));
    await screen.findByRole('dialog', { name: /KAN-31/ });
    expect(document.title).toBe('KAN-31 · Kanbot App · Kanbot');
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(document.title).toBe('Backlog · Kanbot App · Kanbot');
    });

    await router.navigate('/projects/p1/board');
    await screen.findByRole('heading', { name: 'Active Sprint', level: 1 });
    expect(document.title).toBe('Active Sprint · Kanbot App · Kanbot');

    await router.navigate('/projects/p1/sprints');
    await screen.findByRole('heading', { name: 'Sprints', level: 1 });
    await waitFor(() => {
      expect(document.title).toBe('Sprint 3 · Sprints · Kanbot App · Kanbot');
    });
  });

  it('titles the guest pages', async () => {
    renderApp('/login');
    await screen.findByRole('button', { name: 'Log in' });
    expect(document.title).toBe('Log in · Kanbot');
  });
});
