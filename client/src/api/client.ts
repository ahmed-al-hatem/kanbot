import { useSession } from '@/stores/session';
import { ApiError, NETWORK_ERROR_MESSAGE, TIMEOUT_MESSAGE, toApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Query string values; `undefined` and empty strings are left out. */
export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RequestOptions {
  body?: unknown;
  query?: QueryParams;
  /** From TanStack Query, so navigation and new searches cancel stale requests. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 15_000;
export const AI_TIMEOUT_MS = 45_000;

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

/** Paths where a 401 means "wrong credentials", not "session expired". */
const NO_EXPIRE_PATHS = new Set(['/auth/login']);

function buildUrl(path: string, query?: QueryParams): string {
  // Resolved against the page origin so a relative VITE_API_URL ("/api") works everywhere.
  const url = new URL(`${API_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * The only place the app calls `fetch`. Adds the token, parses JSON, and turns
 * every failure into an ApiError (NETWORK_ERROR / TIMEOUT when no response arrived).
 */
export async function request<T>(
  method: HttpMethod,
  path: string,
  { body, query, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: RequestOptions = {},
): Promise<T> {
  const token = useSession.getState().token;
  const headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    // Cancelled by the caller (TanStack Query): rethrow untouched so it is treated as a cancel.
    if (signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new ApiError({ status: 0, code: 'TIMEOUT', message: TIMEOUT_MESSAGE });
    }
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });
  }

  if (!response.ok) {
    if (response.status === 401 && token && !NO_EXPIRE_PATHS.has(path)) {
      useSession.getState().expire();
    }
    throw toApiError(response.status, await readJson(response));
  }

  if (response.status === 204) return undefined as T;
  // `as T` at the boundary: the shape is guaranteed by the shared contract in types/api.ts.
  return (await readJson(response)) as T;
}
