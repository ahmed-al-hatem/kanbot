import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '@/components/FullPageLoader/FullPageLoader';
import { useCurrentUser } from '@/hooks/useAuth';
import { useSession } from '@/stores/session';
import { loginPath } from './redirect';
import styles from './AuthLayout.module.css';

/*
 * Both are rare (an expired session, a failed /auth/me) and would otherwise put Radix
 * AlertDialog and PageError in the startup bundle of every visit (plan §5.4), so they load on
 * demand.
 */
const SessionExpiredDialog = lazy(async () => {
  const { SessionExpiredDialog: Component } = await import('./SessionExpiredDialog');
  return { default: Component };
});

const PageError = lazy(async () => {
  const { PageError: Component } = await import('@/components/PageError/PageError');
  return { default: Component };
});

/**
 * Layout route for every private page (AUTH-3, AUTH-5, AUTH-6):
 * - no token → `/login?redirect=<this page>` (plain `/login` right after Log out);
 * - token, `/auth/me` running → full-page loader; failing for another reason → page error;
 * - session expired mid-use → the page stays behind the non-dismissable dialog;
 * - session expired before the user ever loaded (stale token on startup) → straight to login.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const token = useSession((s) => s.token);
  const sessionExpired = useSession((s) => s.sessionExpired);
  const signedOut = useSession((s) => s.signedOut);
  const me = useCurrentUser();
  const here = `${location.pathname}${location.search}${location.hash}`;

  if (!token) {
    if (sessionExpired && me.data) {
      return (
        <>
          <Outlet />
          {/* No fallback: the page stays as it is for the moment the chunk takes. */}
          <Suspense fallback={null}>
            <SessionExpiredDialog redirectTo={here} />
          </Suspense>
        </>
      );
    }
    return <Navigate to={signedOut ? '/login' : loginPath(here)} replace />;
  }

  if (me.data) return <Outlet />;

  // A 401 never gets here: api/client.ts has already expired the session (no token above).
  if (me.isError) {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <main id="main" tabIndex={-1} className={styles.page}>
          <PageError
            page="your workspace"
            error={me.error}
            onRetry={() => {
              void me.refetch();
            }}
            retrying={me.isRefetching}
            backTo={false}
          />
        </main>
      </Suspense>
    );
  }

  return <FullPageLoader />;
}
