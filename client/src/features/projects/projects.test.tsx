import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { qk } from '@/hooks/queryKeys';
import { useSession } from '@/stores/session';
import { KANBOT, makeProject, PORTFOLIO, projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import type { CreateProjectRequest, ProjectWithStats } from '@/types/api';

let db: ProjectWithStats[];

beforeAll(preloadPages, 30_000);

beforeEach(() => {
  db = [KANBOT, PORTFOLIO];
  useSession.setState({ token: 'test.jwt.token' });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...projectHandlers(db),
  );
});

// The header button; the dashed new-project tile has the same name.
const newProjectButton = async () =>
  (await screen.findAllByRole('button', { name: 'New project' }))[0]!;

const tile = (name: string) => screen.getByRole('heading', { name }).closest('article')!;

describe('projects list (PRJ-1)', () => {
  it('shows a skeleton while loading, then a tile per project with key, description, backlog and sprint', async () => {
    server.use(
      http.get(apiUrl('/projects'), async () => {
        await delay(400);
        return HttpResponse.json({ projects: db });
      }),
    );
    renderApp('/projects');

    expect(await screen.findByRole('heading', { name: 'Projects', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Loading projects')).toBeInTheDocument();

    const kanbot = await screen.findByRole('heading', { name: 'Kanbot App' }, { timeout: 2000 });
    const card = within(kanbot.closest('article')!);
    expect(card.getByRole('link', { name: 'Kanbot App' })).toHaveAttribute(
      'href',
      '/projects/p1/backlog',
    );
    expect(card.getByText('KAN')).toBeInTheDocument();
    expect(card.getByText('Frontend for the Kanbot sprint board.')).toBeInTheDocument();
    expect(card.getByText('12 backlog todos')).toBeInTheDocument();
    expect(card.getByText('Sprint 3 active')).toBeInTheDocument();
    expect(within(tile('Portfolio Site')).getByText('No active sprint')).toBeInTheDocument();
    expect(screen.getByText('2 projects')).toBeInTheDocument();
  });

  it('shows the empty state with "Create your first project" when there are none', async () => {
    db.length = 0;
    renderApp('/projects');

    expect(await screen.findByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your first project' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('shows the page error and loads again with Try again', async () => {
    const user = userEvent.setup();
    // The app retries 5xx twice with backoff; skip that here.
    queryClient.setQueryDefaults(qk.projects, { retry: false });
    try {
      server.use(
        http.get(apiUrl('/projects'), () =>
          HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 }),
        ),
      );
      renderApp('/projects');

      expect(
        await screen.findByRole('heading', { name: "We couldn't load your projects" }),
      ).toBeInTheDocument();
      expect(screen.getByText('Error 500 · Internal server error')).toBeInTheDocument();

      server.use(...projectHandlers(db));
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByRole('heading', { name: 'Kanbot App' })).toBeInTheDocument();
    } finally {
      queryClient.setQueryDefaults(qk.projects, {});
    }
  });

  it('filters by name or key, says when nothing matches, and Clear search brings them back', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/projects');
    const search = await screen.findByRole('searchbox', { name: 'Search projects' });

    await user.type(search, 'port');
    expect(screen.getByRole('heading', { name: 'Portfolio Site' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Kanbot App' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=port');

    await user.clear(search);
    await user.type(search, 'kan');
    expect(screen.getByRole('heading', { name: 'Kanbot App' })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'zzz');
    expect(screen.getByRole('heading', { name: 'No projects match “zzz”' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('heading', { name: 'Kanbot App' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Portfolio Site' })).toBeInTheDocument();
    expect(search).toHaveValue('');
  });
});

describe('create project (PRJ-2)', () => {
  it('previews the generated key, shows a 409 under Key, then opens the new backlog', async () => {
    const user = userEvent.setup();
    const bodies: CreateProjectRequest[] = [];
    server.use(
      http.post(apiUrl('/projects'), async ({ request }) => {
        const body = (await request.json()) as CreateProjectRequest;
        bodies.push(body);
        if (body.key === 'KAN') {
          return HttpResponse.json(
            errorBody('CONFLICT', 'You already have a project with the key "KAN".', [
              { path: 'key', message: 'This key is already used by another project' },
            ]),
            { status: 409 },
          );
        }
        const project = makeProject({ id: 'p3', name: body.name, key: body.key ?? 'KM' });
        db.unshift(project);
        return HttpResponse.json({ project }, { status: 201 });
      }),
    );
    const { router } = renderApp('/projects');

    await user.click(await newProjectButton());
    const dialog = await screen.findByRole('dialog', { name: 'Create project' });
    const name = within(dialog).getByLabelText(/Project name/);
    await waitFor(() => {
      expect(name).toHaveFocus();
    });

    // Mirrors the server: "Kanbot" → KAN, taken → KANA.
    await user.type(name, 'Kanbot');
    expect(within(dialog).getByText('Todos will be numbered KANA-1')).toBeInTheDocument();
    await user.clear(name);
    await user.type(name, 'Kanbot Mobile');
    expect(within(dialog).getByText('Todos will be numbered KM-1')).toBeInTheDocument();

    const key = within(dialog).getByLabelText('Key');
    await user.type(key, 'kan');
    expect(key).toHaveValue('KAN');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(await within(dialog).findByText('This key is already used')).toBeInTheDocument();
    expect(key).toHaveAttribute('aria-invalid', 'true');
    expect(key).toHaveFocus();
    expect(bodies[0]).toEqual({ name: 'Kanbot Mobile', key: 'KAN', description: '' });

    await user.clear(key);
    await user.type(key, 'kbm');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(await screen.findByRole('heading', { name: 'Backlog', level: 1 })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/projects/p3/backlog');
    expect(screen.getByText('Kanbot Mobile created')).toBeInTheDocument();
    expect(bodies[1]).toEqual({ name: 'Kanbot Mobile', key: 'KBM', description: '' });
  });

  it('validates the name and key on submit without calling the API', async () => {
    const user = userEvent.setup();
    renderApp('/projects');

    await user.click(await newProjectButton());
    const dialog = await screen.findByRole('dialog', { name: 'Create project' });
    await user.type(within(dialog).getByLabelText('Key'), 'k1');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(await within(dialog).findByText('Give your project a name')).toBeInTheDocument();
    expect(within(dialog).getByText('Key must be 2–6 letters')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Project name/)).toHaveFocus();
  });
});

describe('edit project (PRJ-3)', () => {
  it('opens with the current values, says todo keys stay, and saves the changes', async () => {
    const user = userEvent.setup();
    let patch: unknown;
    server.use(
      http.patch(apiUrl('/projects/p1'), async ({ request }) => {
        patch = await request.json();
        return HttpResponse.json({ project: { ...KANBOT, name: 'Kanbot Web', key: 'KBW' } });
      }),
    );
    renderApp('/projects');

    await user.click(await screen.findByRole('button', { name: 'Actions for Kanbot App' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit project' });

    expect(within(dialog).getByLabelText(/Project name/)).toHaveValue('Kanbot App');
    expect(
      within(dialog).getByText("Changing the key doesn't change existing todo keys."),
    ).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText(/Project name/));
    await user.type(within(dialog).getByLabelText(/Project name/), 'Kanbot Web');
    const key = within(dialog).getByLabelText(/Key/);
    await user.clear(key);
    await user.type(key, 'kbw');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Kanbot Web updated')).toBeInTheDocument();
    expect(patch).toEqual({ name: 'Kanbot Web', key: 'KBW', description: KANBOT.description });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('delete project (PRJ-4)', () => {
  it('confirms with the project name and what goes with it, then removes the tile with a toast', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.delete(apiUrl('/projects/p1'), () => {
        deleted = true;
        db.splice(db.indexOf(KANBOT), 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { router } = renderApp('/projects');

    await user.click(await screen.findByRole('button', { name: 'Actions for Kanbot App' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    const confirm = await screen.findByRole('alertdialog', { name: 'Delete Kanbot App?' });
    expect(confirm).toHaveTextContent('all of its sprints and its 24 todos');
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.click(within(confirm).getByRole('button', { name: 'Delete project' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Kanbot App' })).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Kanbot App deleted')).toBeInTheDocument();
    expect(deleted).toBe(true);
    expect(router.state.location.pathname).toBe('/projects');
    expect(screen.getByRole('heading', { name: 'Portfolio Site' })).toBeInTheDocument();
    // The ⋯ that had focus left with its tile: focus moves to the next tile, not <body>.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Portfolio Site' })).toHaveFocus();
    });
  });

  it('puts the tile back with an error toast when the delete fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(apiUrl('/projects/p1'), () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 }),
      ),
    );
    renderApp('/projects');

    await user.click(await screen.findByRole('button', { name: 'Actions for Kanbot App' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Delete project',
      }),
    );

    expect(
      await screen.findByText("Couldn't delete Kanbot App. Something went wrong"),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kanbot App' })).toBeInTheDocument();
  });
});
