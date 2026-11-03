import { createBrowserRouter, type RouteObject } from 'react-router';

/**
 * Dev-only design-system catalogue. `import.meta.env.DEV` is replaced by `false` in
 * `vite build`, so this branch and its lazy chunk are dropped from the production bundle.
 */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/__ui',
        lazy: async () => {
          const { UiPage } = await import('@/dev/UiPage');
          return { Component: UiPage };
        },
      },
    ]
  : [];

/**
 * Routes are added phase by phase, each page lazy-loaded (plan §5.4).
 * Until phase 2 every other path shows the foundations placeholder.
 */
export const router = createBrowserRouter([
  ...devRoutes,
  {
    path: '*',
    lazy: async () => {
      const { FoundationsPage } = await import('@/app/FoundationsPage');
      return { Component: FoundationsPage };
    },
  },
]);
