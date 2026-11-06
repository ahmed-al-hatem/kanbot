import { DirectionProvider } from '@radix-ui/react-direction';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { AppErrorBoundary } from '@/features/errors/AppErrorBoundary';
import { useDirection } from '@/i18n';
import { router } from '@/router';
import { LiveRegion } from './LiveRegion';
import { queryClient } from './queryClient';
import { Toaster } from './Toaster';

/**
 * App-wide providers and the global hosts: the Toast (Flag) and the live region. The
 * SessionExpiredDialog lives in the private layout route, the only place a 401 can expire a
 * session (features/auth/ProtectedRoute). `AppErrorBoundary` catches whatever escapes the
 * router's own error boundaries (features/errors). `DirectionProvider` tells Radix (menus' arrow
 * keys, side placement) the reading direction of the current locale.
 */
export function Providers() {
  const dir = useDirection();
  return (
    <AppErrorBoundary>
      <DirectionProvider dir={dir}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
          <LiveRegion />
        </QueryClientProvider>
      </DirectionProvider>
    </AppErrorBoundary>
  );
}
