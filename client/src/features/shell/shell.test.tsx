import { onlineManager } from '@tanstack/react-query';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { qk } from '@/hooks/queryKeys';
import { useSession } from '@/stores/session';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';

beforeAll(preloadPages, 30_000);

beforeEach(() => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...projectHandlers(),
  );
});

afterEach(() => {
  onlineManager.setOnline(true);
});

const nav = () => screen.getByRole('navigation', { name: 'Main' });
const navLink = (name: string) => within(nav()).getByRole('link', { name });

describe('shell landmarks and nav (DESIGN §6, §10.2)', () => {
  it('has the skip link first, one h1, <main id="main"> and aria-current on the active page', async () => {
    renderApp('/projects/p1/board');

    expect(
      await screen.findByRole('heading', { name: 'Active Sprint', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );

    expect(navLink('Active Sprint')).toHaveAttribute('aria-current', 'page');
    expect(navLink('Backlog')).not.toHaveAttribute('aria-current');
    expect(navLink('Sprints')).toHaveAttribute('href', '/projects/p1/sprints');
    expect(navLink('Projects')).not.toHaveAttribute('aria-current');
  });

  it('on /projects only Projects is current and the project pages are not offered', async () => {
    renderApp('/projects');

    await screen.findByRole('heading', { name: 'Kanbot App' });
    expect(navLink('Projects')).toHaveAttribute('aria-current', 'page');
    expect(within(nav()).queryByRole('link', { name: 'Backlog' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose a project' })).toBeInTheDocument();
  });

  it('moves focus to the new page h1 after navigating', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');
    await screen.findByRole('heading', { name: 'Backlog', level: 1 });

    await user.click(navLink('Sprints'));

    const heading = await screen.findByRole('heading', { name: 'Sprints', level: 1 });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(navLink('Sprints')).toHaveAttribute('aria-current', 'page');
  });

  it('opens /projects/:projectId on its backlog', async () => {
    const { router } = renderApp('/projects/p2');

    expect(await screen.findByRole('heading', { name: 'Backlog', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/p2/backlog');
  });

  it('shows the 404 page for a project id the API does not know, with no project nav', async () => {
    renderApp('/projects/nope/backlog');

    expect(
      await screen.findByRole('heading', { name: "This project doesn't exist", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Projects' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(within(nav()).queryByRole('link', { name: 'Backlog' })).not.toBeInTheDocument();
    expect(within(nav()).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
  });

  it('keeps the page error for a project that fails to load for another reason', async () => {
    // The app retries 5xx twice with backoff; skip that here.
    queryClient.setQueryDefaults(qk.project('p3'), { retry: false });
    server.use(
      http.get(apiUrl('/projects/p3'), () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'Boom'), { status: 500 }),
      ),
    );
    renderApp('/projects/p3/backlog');

    expect(
      await screen.findByRole('heading', { name: "We couldn't load this project" }),
    ).toBeInTheDocument();
    expect(screen.getByText('Error 500 · Internal server error')).toBeInTheDocument();
  });
});

describe('project switcher (PRJ-5)', () => {
  it('lists the projects and opens the chosen one on the same page', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/board');

    const switcher = await screen.findByRole('button', {
      name: /^Switch project, current: Kanbot App/,
    });
    await user.click(switcher);
    const menu = await screen.findByRole('menu', { name: 'Projects' });
    const current = within(menu).getByRole('menuitem', { name: /Kanbot App/ });
    expect(within(current).getByRole('img', { name: 'Current' })).toBeInTheDocument();

    await user.click(within(menu).getByRole('menuitem', { name: /Portfolio Site/ }));

    expect(
      await screen.findByRole('button', { name: /^Switch project, current: Portfolio Site/ }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/p2/board');
    expect(navLink('Active Sprint')).toHaveAttribute('href', '/projects/p2/board');
  });

  it('"View all projects" goes to /projects', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');

    await user.click(
      await screen.findByRole('button', { name: /^Switch project, current: Kanbot App/ }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'View all projects' }));

    expect(await screen.findByRole('heading', { name: 'Projects', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects');
  });
});

describe('profile menu (AUTH-4)', () => {
  it('logs out from the profile menu', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: new RegExp(TEST_USER.name) }));
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(useSession.getState().token).toBeNull();
  });
});

describe('mobile nav, Ask AI and offline', () => {
  it('the hamburger toggles the nav panel and Esc closes it back to the button', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    const hamburger = await screen.findByRole('button', { name: 'Navigation' });
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(hamburger).toHaveAttribute('aria-controls', nav().id);

    await user.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(hamburger).toHaveFocus();
  });

  it('Ask AI opens the assistant drawer and Esc closes it', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    const askAi = (await screen.findAllByRole('button', { name: 'Ask AI' }))[0]!;
    await user.click(askAi);

    expect(await screen.findByRole('dialog', { name: 'Kanbot Assistant' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('shows the offline banner and a "Back online" toast on reconnect', async () => {
    renderApp('/projects');
    await screen.findByRole('heading', { name: 'Kanbot App' });

    act(() => {
      onlineManager.setOnline(false);
    });
    expect(
      await screen.findByText("You're offline. Changes can't be saved until you reconnect."),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry now' })).toBeInTheDocument();

    act(() => {
      onlineManager.setOnline(true);
    });
    expect(await screen.findByText('Back online')).toBeInTheDocument();
    expect(
      screen.queryByText("You're offline. Changes can't be saved until you reconnect."),
    ).not.toBeInTheDocument();
  });
});
