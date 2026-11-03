import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { FullPageLoader } from '@/components/FullPageLoader/FullPageLoader';
import { GuestRoute } from '@/features/auth/GuestRoute';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { pageChunks } from '@/routeChunks';

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
 * Guest pages, then the private layout (plan §4, IMPLEMENTATION-PLAN §3.1): the guard, the
 * app shell, then Projects and the project pages. Every page is lazy-loaded (plan §5.4); the
 * guards are tiny and load with the app. Backlog, Board and Sprints are placeholders until
 * phases 4–6.
 */
export const routes: RouteObject[] = [
  {
    // Shown while the first route chunk loads.
    hydrateFallbackElement: <FullPageLoader label="Loading Kanbot" />,
    children: [
      ...devRoutes,
      {
        Component: GuestRoute,
        children: [
          {
            path: '/login',
            lazy: async () => {
              const { LoginPage } = await import('@/features/auth/LoginPage');
              return { Component: LoginPage };
            },
          },
          {
            path: '/register',
            lazy: async () => {
              const { RegisterPage } = await import('@/features/auth/RegisterPage');
              return { Component: RegisterPage };
            },
          },
          {
            path: '/forgot-password',
            lazy: async () => {
              const { ForgotPasswordPage } = await import('@/features/auth/ForgotPasswordPage');
              return { Component: ForgotPasswordPage };
            },
          },
        ],
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            lazy: async () => ({ Component: (await pageChunks.shell()).AppShell }),
            children: [
              { path: '/', element: <Navigate to="/projects" replace /> },
              {
                path: '/projects',
                lazy: async () => ({ Component: (await pageChunks.projects()).ProjectsPage }),
              },
              {
                path: '/projects/:projectId',
                lazy: async () => ({ Component: (await pageChunks.project()).ProjectLayout }),
                children: [
                  { index: true, element: <Navigate to="backlog" replace /> },
                  {
                    path: 'backlog',
                    lazy: async () => ({ Component: (await pageChunks.backlog()).BacklogPage }),
                  },
                  {
                    path: 'board',
                    lazy: async () => ({ Component: (await pageChunks.board()).BoardPage }),
                  },
                  {
                    path: 'sprints/:sprintId?',
                    lazy: async () => ({ Component: (await pageChunks.sprints()).SprintsPage }),
                  },
                ],
              },
            ],
          },
        ],
      },
      // The 404 page comes in phase 8; until then unknown paths go home (and through the guard).
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
