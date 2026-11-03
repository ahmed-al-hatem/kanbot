import { createBrowserRouter } from 'react-router';

/**
 * Routes are added phase by phase, each page lazy-loaded (plan §5.4).
 * Phase 0 only has a placeholder so the app boots.
 */
export const router = createBrowserRouter([
  {
    path: '*',
    lazy: async () => {
      const { FoundationsPage } = await import('@/app/FoundationsPage');
      return { Component: FoundationsPage };
    },
  },
]);
