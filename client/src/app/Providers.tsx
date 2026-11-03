import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { router } from '@/router';
import { LiveRegion } from './LiveRegion';
import { queryClient } from './queryClient';
import { Toaster } from './Toaster';

/**
 * App-wide providers and the global hosts: the Toast (Flag) and the live region. The
 * SessionExpiredDialog lives in the private layout route, the only place a 401 can expire a
 * session (features/auth/ProtectedRoute).
 */
export function Providers() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      <LiveRegion />
    </QueryClientProvider>
  );
}
