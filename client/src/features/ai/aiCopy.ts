import { isApiError } from '@/api/errors';

/** AI-5: carried by every AI surface. */
export const AI_DISCLAIMER = 'AI can make mistakes. Review before saving.';

/**
 * The server's own message for 502 AI_ERROR and 429 RATE_LIMITED (AI-5), and the client's for
 * NETWORK_ERROR / TIMEOUT; a non-API error gets a generic line.
 */
export function aiErrorMessage(error: unknown): string {
  return isApiError(error) ? error.message : 'Something went wrong. Please try again.';
}
