import { QueryClient } from '@tanstack/react-query';
import { isClientError } from '@/api/errors';

const MAX_RETRIES = 2;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // 4xx won't change on retry, and retrying a 429 makes the rate limit worse (plan §9.2).
      retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
    },
    mutations: {
      retry: false,
    },
  },
});
