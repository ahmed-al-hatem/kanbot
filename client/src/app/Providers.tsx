import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { router } from '@/router';
import { queryClient } from './queryClient';

/** App-wide providers. Hosts (Toaster, LiveRegion, SessionExpiredDialog) join in later phases. */
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
