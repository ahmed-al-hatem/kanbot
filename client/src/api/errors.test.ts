import { describe, expect, it } from 'vitest';
import { ApiError, fieldErrors, isClientError, toApiError } from './errors';

describe('fieldErrors()', () => {
  it('maps details to { field: message }, keeping the first message per field', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      details: [
        { path: 'name', message: 'Required' },
        { path: 'name', message: 'Too long' },
        { path: 'key', message: 'Letters only' },
      ],
    });
    expect(fieldErrors(error)).toEqual({ name: 'Required', key: 'Letters only' });
  });

  it('returns {} for anything that is not an ApiError', () => {
    expect(fieldErrors(new Error('boom'))).toEqual({});
    expect(fieldErrors(undefined)).toEqual({});
  });
});

describe('isClientError()', () => {
  it('is true for 4xx only', () => {
    expect(isClientError(toApiError(404, undefined))).toBe(true);
    expect(isClientError(toApiError(429, undefined))).toBe(true);
    expect(isClientError(toApiError(500, undefined))).toBe(false);
    expect(isClientError(new Error('x'))).toBe(false);
  });
});

describe('toApiError()', () => {
  it('keeps code, message and details from an ApiErrorBody', () => {
    const body = { error: { code: 'CONFLICT', message: 'Key taken', details: [] } };
    expect(toApiError(409, body)).toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Key taken',
    });
  });

  it('derives the code from the status when the body is not an ApiErrorBody', () => {
    expect(toApiError(409, 'oops')).toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(toApiError(503, undefined)).toMatchObject({ status: 503, code: 'NETWORK_ERROR' });
  });
});
