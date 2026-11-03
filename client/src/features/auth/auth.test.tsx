import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { qk } from '@/hooks/queryKeys';
import { STORAGE_KEYS } from '@/lib/storage';
import { useSession } from '@/stores/session';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';

const TOKEN = 'test.jwt.token';
const EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

function meOk() {
  return http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER }));
}

function me401() {
  return http.get(apiUrl('/auth/me'), () =>
    HttpResponse.json(errorBody('UNAUTHORIZED', 'Your session has expired. Please log in again.'), { status: 401 }),
  );
}

function signedIn() {
  useSession.setState({ token: TOKEN });
  server.use(meOk());
}

function savedToken(): unknown {
  const raw = window.localStorage.getItem(STORAGE_KEYS.token);
  return raw ? (JSON.parse(raw) as { state: { token: unknown } }).state.token : undefined;
}

beforeAll(preloadPages, 30_000);

// Private pages render the app shell, which loads the projects.
beforeEach(() => {
  server.use(...projectHandlers());
});

const currentPath = (router: ReturnType<typeof renderApp>['router']) =>
  `${router.state.location.pathname}${router.state.location.search}`;

describe('guards (AUTH-5)', () => {
  it('sends a signed-out visitor to /login?redirect=<the page>', async () => {
    const { router } = renderApp('/projects/p1/board?todo=t1');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toBe(`?redirect=${encodeURIComponent('/projects/p1/board?todo=t1')}`);
  });

  it('sends a signed-in user away from /login, to ?redirect= when present', async () => {
    signedIn();
    const { router } = renderApp('/login?redirect=%2Fprojects%2Fp1%2Fboard');

    expect(await screen.findByRole('heading', { name: 'Active Sprint' })).toBeInTheDocument();
    expect(currentPath(router)).toBe('/projects/p1/board');
  });

  it('sends a signed-in user away from /register to Projects', async () => {
    signedIn();
    const { router } = renderApp('/register');

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(currentPath(router)).toBe('/projects');
  });

  it('ignores a ?redirect= that leaves the app', async () => {
    signedIn();
    const { router } = renderApp('/login?redirect=%2F%2Fevil.example');

    await screen.findByRole('heading', { name: 'Projects' });
    expect(currentPath(router)).toBe('/projects');
  });
});

describe('login (AUTH-2)', () => {
  it('shows the server 401 message above the form, marks the password invalid, and clears it on edit', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/auth/login'), () =>
        HttpResponse.json(errorBody('UNAUTHORIZED', 'Incorrect email or password.'), { status: 401 }),
      ),
    );
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Incorrect email or password.');
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription('Incorrect email or password.');
    expect(useSession.getState().token).toBeNull();

    await user.type(screen.getByLabelText('Email'), 'x');
    expect(screen.queryByText('Incorrect email or password.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid');
  });

  it('validates on submit and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    renderApp('/login');

    await user.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByTestId('live-polite')).toHaveTextContent('2 fields need attention');
  });

  it('signs in and lands on the page from ?redirect=', async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.post(apiUrl('/auth/login'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ token: TOKEN, user: TEST_USER });
      }),
    );
    const { router } = renderApp('/login?redirect=%2Fprojects%2Fp1%2Fbacklog');

    await user.type(await screen.findByLabelText('Email'), '  sara@example.com ');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.keyboard('{Enter}');

    expect(await screen.findByText(TEST_USER.name)).toBeInTheDocument();
    expect(currentPath(router)).toBe('/projects/p1/backlog');
    expect(body).toEqual({ email: 'sara@example.com', password: 'password123' });
  });
});

describe('register (AUTH-1)', () => {
  async function fillRegister(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText('Name'), 'Sara Ahmed');
    await user.type(screen.getByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
  }

  it('shows a 409 under Email and focuses it', async () => {
    const user = userEvent.setup();
    const message = 'An account with this email already exists.';
    server.use(
      http.post(apiUrl('/auth/register'), () =>
        HttpResponse.json(errorBody('CONFLICT', message, [{ path: 'email', message }]), { status: 409 }),
      ),
    );
    renderApp('/register');

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const email = screen.getByLabelText('Email');
    await waitFor(() => {
      expect(email).toHaveAccessibleDescription(message);
    });
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    expect(useSession.getState().token).toBeNull();
  });

  it('puts server validation details under the matching field', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/auth/register'), () =>
        HttpResponse.json(
          errorBody('VALIDATION_ERROR', 'Invalid request', [{ path: 'name', message: 'Name is too long' }]),
          { status: 400 },
        ),
      ),
    );
    renderApp('/register');

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Name is too long');
    });
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('checks that the passwords match', async () => {
    const user = userEvent.setup();
    renderApp('/register');

    await user.type(await screen.findByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password12');
    await user.tab();

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Confirm password'), '3');
    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  });

  it('shows the password strength', async () => {
    const user = userEvent.setup();
    renderApp('/register');

    const password = await screen.findByLabelText('Password');
    await user.type(password, 'short');
    expect(password).toHaveAccessibleDescription(/Password strength: Too short/);
    await user.type(password, '-word-2026!');
    expect(password).toHaveAccessibleDescription(/Password strength: Strong/);
  });

  it('signs the user in, opens Projects and shows a welcome toast', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(apiUrl('/auth/register'), () => HttpResponse.json({ token: TOKEN, user: TEST_USER }, { status: 201 })),
    );
    const { router } = renderApp('/register');

    await fillRegister(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Welcome to Kanbot, Sara')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Projects' });
    expect(currentPath(router)).toBe('/projects');
    expect(useSession.getState().token).toBe(TOKEN);
  });
});

describe('staying logged in (AUTH-3)', () => {
  it('persists the token on log in', async () => {
    const user = userEvent.setup();
    server.use(http.post(apiUrl('/auth/login'), () => HttpResponse.json({ token: TOKEN, user: TEST_USER })));
    renderApp('/login');

    await user.type(await screen.findByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await screen.findByRole('heading', { name: 'Projects' });
    expect(savedToken()).toBe(TOKEN);
  });

  it('after a reload, reads the saved token and shows a full-page loader during /auth/me', async () => {
    // What a previous visit left in storage; the in-memory store starts empty as after a reload.
    window.localStorage.setItem(STORAGE_KEYS.token, JSON.stringify({ state: { token: 'saved.jwt' }, version: 0 }));
    await act(async () => {
      await useSession.persist.rehydrate();
    });
    expect(useSession.getState().token).toBe('saved.jwt');

    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let auth: string | null = null;
    server.use(
      http.get(apiUrl('/auth/me'), async ({ request }) => {
        auth = request.headers.get('Authorization');
        await gate;
        return HttpResponse.json({ user: TEST_USER });
      }),
    );
    renderApp('/projects');

    expect(await screen.findByText('Loading your workspace')).toBeInTheDocument();
    release();
    expect(await screen.findByText(TEST_USER.name)).toBeInTheDocument();
    expect(auth).toBe('Bearer saved.jwt');
  });

  it('shows a page error with Try again when /auth/me fails for another reason', async () => {
    const user = userEvent.setup();
    // The app retries 5xx twice with backoff; skip that here and restore the default after.
    queryClient.setQueryDefaults(qk.me, { retry: false });
    try {
      useSession.setState({ token: TOKEN });
      server.use(
        http.get(apiUrl('/auth/me'), () =>
          HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 }),
        ),
      );
      renderApp('/projects');

      expect(await screen.findByRole('heading', { name: "We couldn't load your workspace" })).toBeInTheDocument();
      expect(useSession.getState().token).toBe(TOKEN);

      server.use(meOk());
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText(TEST_USER.name)).toBeInTheDocument();
    } finally {
      queryClient.setQueryDefaults(qk.me, {});
    }
  });

  it('a saved token the server rejects clears the session and shows login', async () => {
    useSession.setState({ token: 'stale.jwt' });
    server.use(me401());
    const { router } = renderApp('/projects');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(currentPath(router)).toBe('/login?redirect=%2Fprojects');
    expect(screen.getByText(EXPIRED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(savedToken()).toBeNull();
  });
});

describe('log out (AUTH-4)', () => {
  it('clears the token and the cache, then goes to /login', async () => {
    const user = userEvent.setup();
    signedIn();
    const { router } = renderApp('/projects/p1/board');

    // AUTH-4: Log out lives in the profile menu at the bottom of the sidebar.
    await user.click(await screen.findByRole('button', { name: new RegExp(TEST_USER.name) }));
    await user.click(await screen.findByRole('menuitem', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(currentPath(router)).toBe('/login');
    expect(savedToken()).toBeNull();
    expect(queryClient.getQueryData(qk.me)).toBeUndefined();
    expect(screen.queryByText(EXPIRED_MESSAGE)).not.toBeInTheDocument();
  });
});

describe('expired session (AUTH-6)', () => {
  it('a 401 mid-session opens a dialog that only "Log in again" closes, then login shows the message', async () => {
    const user = userEvent.setup();
    signedIn();
    const { router } = renderApp('/projects/p1/board');
    await screen.findByText(TEST_USER.name);

    server.use(me401());
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: qk.me });
    });

    const dialog = await screen.findByRole('alertdialog', { name: 'Your session has expired' });
    expect(useSession.getState().token).toBeNull();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    const action = within(dialog).getByRole('button', { name: 'Log in again' });
    expect(action).toHaveFocus();
    await user.click(action);

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(currentPath(router)).toBe(`/login?redirect=${encodeURIComponent('/projects/p1/board')}`);
    expect(screen.getByText(EXPIRED_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('logging in again returns to the page and clears the message', async () => {
    const user = userEvent.setup();
    useSession.setState({ sessionExpired: true });
    server.use(http.post(apiUrl('/auth/login'), () => HttpResponse.json({ token: TOKEN, user: TEST_USER })));
    const { router } = renderApp('/login?redirect=%2Fprojects%2Fp1%2Fboard');

    expect(await screen.findByText(EXPIRED_MESSAGE)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await screen.findByText(TEST_USER.name);
    expect(currentPath(router)).toBe('/projects/p1/board');
    expect(useSession.getState().sessionExpired).toBe(false);
  });
});

describe('forgot password (frontend only)', () => {
  it('validates the email and says the page is a demo', async () => {
    const user = userEvent.setup();
    renderApp('/forgot-password');

    await user.type(await screen.findByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByText('Enter a valid email, like name@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Demo only/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to log in' })).toHaveAttribute('href', '/login');
  });
});
