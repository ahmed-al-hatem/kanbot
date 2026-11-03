import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { LiveRegion } from '@/app/LiveRegion';
import { queryClient } from '@/app/queryClient';
import { Toaster } from '@/app/Toaster';
import { routes } from '@/router';
import type { User } from '@/types/api';

/** The whole app (real routes, guards and hosts) on a memory router starting at `path`. */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
      <LiveRegion />
    </QueryClientProvider>,
  );
  return { ...utils, router };
}

export const TEST_USER: User = {
  id: 'u1',
  name: 'Sara Ahmed',
  email: 'sara@example.com',
  createdAt: '2026-11-01T09:00:00.000Z',
};

/** An `ApiErrorBody` response body. */
export function errorBody(code: string, message: string, details?: { path: string; message: string }[]) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}
