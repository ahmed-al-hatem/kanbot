import { Navigate, Outlet, useSearchParams } from 'react-router';
import { useSession } from '@/stores/session';
import { safeRedirect } from './redirect';

/**
 * Layout route for Log in, Sign up and Forgot password. A signed-in user goes to the app
 * (AUTH-5) — to `?redirect=` when there is one, which is also how a successful log in lands on
 * the page that was asked for (AUTH-2).
 */
export function GuestRoute() {
  const token = useSession((s) => s.token);
  const [search] = useSearchParams();
  if (token) return <Navigate to={safeRedirect(search.get('redirect'))} replace />;
  return <Outlet />;
}
