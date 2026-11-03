import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { apiUrl, server } from '@/test/server';
import { request } from './client';
import { ApiError, fieldErrors, NETWORK_ERROR_MESSAGE } from './errors';

const TOKEN = 'test.jwt.token';

const never = () => new Promise<never>(() => undefined);

describe('request()', () => {
  it('returns parsed JSON and sends the bearer token', async () => {
    useSession.setState({ token: TOKEN });
    let auth: string | null = null;
    server.use(
      http.get(apiUrl('/projects'), ({ request: req }) => {
        auth = req.headers.get('Authorization');
        return HttpResponse.json({ projects: [] });
      }),
    );

    await expect(request('GET', '/projects')).resolves.toEqual({ projects: [] });
    expect(auth).toBe(`Bearer ${TOKEN}`);
  });

  it('sends a JSON body with Content-Type, and no Authorization without a token', async () => {
    let contentType: string | null = null;
    let auth: string | null = 'unset';
    let body: unknown;
    server.use(
      http.post(apiUrl('/auth/login'), async ({ request: req }) => {
        contentType = req.headers.get('Content-Type');
        auth = req.headers.get('Authorization');
        body = await req.json();
        return HttpResponse.json({ ok: true });
      }),
    );

    await request('POST', '/auth/login', { body: { email: 'a@b.c', password: 'x' } });
    expect(contentType).toBe('application/json');
    expect(auth).toBeNull();
    expect(body).toEqual({ email: 'a@b.c', password: 'x' });
  });

  it('adds defined, non-empty query params only', async () => {
    let search = '';
    server.use(
      http.get(apiUrl('/projects/p1/todos'), ({ request: req }) => {
        search = new URL(req.url).search;
        return HttpResponse.json({ todos: [] });
      }),
    );

    await request('GET', '/projects/p1/todos', {
      query: { sprintId: 'backlog', search: '', priority: undefined },
    });
    expect(search).toBe('?sprintId=backlog');
  });

  it('returns undefined on 204', async () => {
    server.use(http.delete(apiUrl('/todos/t1'), () => new HttpResponse(null, { status: 204 })));
    await expect(request('DELETE', '/todos/t1')).resolves.toBeUndefined();
  });

  it('throws ApiError with status, code, message and details on non-2xx', async () => {
    server.use(
      http.post(apiUrl('/auth/register'), () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'email: Enter a valid email address',
              details: [{ path: 'email', message: 'Enter a valid email address' }],
            },
          },
          { status: 400 },
        ),
      ),
    );

    const error = await request('POST', '/auth/register', { body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'email: Enter a valid email address',
    });
    expect(fieldErrors(error)).toEqual({ email: 'Enter a valid email address' });
  });

  it('expires the session on a 401 for an authenticated request', async () => {
    useSession.setState({ token: TOKEN });
    server.use(
      http.get(apiUrl('/auth/me'), () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Your session has expired.' } },
          { status: 401 },
        ),
      ),
    );

    await expect(request('GET', '/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState()).toMatchObject({ token: null, sessionExpired: true });
  });

  it('does not expire the session on a 401 from /auth/login (wrong credentials)', async () => {
    useSession.setState({ token: TOKEN });
    server.use(
      http.post(apiUrl('/auth/login'), () =>
        HttpResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Wrong email or password' } },
          { status: 401 },
        ),
      ),
    );

    await expect(request('POST', '/auth/login', { body: {} })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Wrong email or password',
    });
    expect(useSession.getState().sessionExpired).toBe(false);
  });

  it('throws NETWORK_ERROR when the server cannot be reached', async () => {
    server.use(http.get(apiUrl('/projects'), () => HttpResponse.error()));
    await expect(request('GET', '/projects')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: NETWORK_ERROR_MESSAGE,
    });
  });

  it('treats a non-JSON 5xx (dev proxy, server down) as NETWORK_ERROR', async () => {
    server.use(
      http.get(apiUrl('/projects'), () => new HttpResponse('Bad gateway', { status: 502 })),
    );
    await expect(request('GET', '/projects')).rejects.toMatchObject({
      status: 502,
      code: 'NETWORK_ERROR',
    });
  });

  it('throws TIMEOUT when the server is too slow', async () => {
    server.use(http.get(apiUrl('/projects'), never));
    await expect(request('GET', '/projects', { timeoutMs: 20 })).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('rethrows the abort untouched when the caller cancels (TanStack Query)', async () => {
    server.use(http.get(apiUrl('/projects'), never));
    const controller = new AbortController();
    const pending = request('GET', '/projects', { signal: controller.signal });
    controller.abort();

    const error = await pending.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
    expect((error as Error).name).toBe('AbortError');
  });
});
