import type { HealthResponse } from '@/types/api';
import { request } from './client';

/** Unauthenticated ping; the offline banner's "Retry now" uses it to check the connection. */
export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('GET', '/health', { signal });
}
