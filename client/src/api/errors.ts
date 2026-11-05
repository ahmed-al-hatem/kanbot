import type { ApiErrorBody, ErrorCode } from '@/types/api';

/** Server codes plus the two the client produces itself. */
export type ApiErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT';

export interface FieldIssue {
  path: string;
  message: string;
}

interface ApiErrorInit {
  status: number;
  code: ApiErrorCode;
  message: string;
  details?: FieldIssue[];
}

/** Every failed request rejects with this. `status` is 0 when no response arrived. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: FieldIssue[];

  constructor({ status, code, message, details = [] }: ApiErrorInit) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Is it running?';
export const TIMEOUT_MESSAGE = 'The server took too long to respond. Please try again.';

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** A 404: the id doesn't exist, or belongs to another user (the API doesn't tell them apart). */
export function isNotFoundError(error: unknown): boolean {
  return isApiError(error) && error.status === 404;
}

/** True for 4xx responses: retrying won't help (wrong input, not found, rate limited…). */
export function isClientError(error: unknown): boolean {
  return isApiError(error) && error.status >= 400 && error.status < 500;
}

/**
 * Maps VALIDATION_ERROR details to `{ field: message }` so forms can call
 * `setError(field, …)`. The first message per field wins.
 */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isApiError(error)) return {};
  const result: Record<string, string> = {};
  for (const { path, message } of error.details) {
    if (path && !(path in result)) result[path] = message;
  }
  return result;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

/** Builds an ApiError from a non-2xx response body (falls back when it isn't ApiErrorBody). */
export function toApiError(status: number, body: unknown): ApiError {
  if (isApiErrorBody(body)) {
    return new ApiError({
      status,
      code: body.error.code,
      message: body.error.message,
      details: body.error.details,
    });
  }
  // The API always answers with ApiErrorBody, so anything else came from the dev/preview
  // proxy: a 5xx there means the server isn't running.
  if (status >= 500) {
    return new ApiError({ status, code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });
  }
  return new ApiError({
    status,
    code: CODE_BY_STATUS[status] ?? 'VALIDATION_ERROR',
    message: `Request failed (${status}). Please try again.`,
  });
}

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};
