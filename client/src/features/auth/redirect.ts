export const HOME_PATH = '/projects';

const GUEST_PATHS = ['/login', '/register', '/forgot-password'];

/**
 * The `?redirect=` target after logging in, or Projects. Only same-origin app paths are
 * accepted: `//evil.example` or `https://…` would turn the login page into an open redirect,
 * and a guest page would bounce straight back.
 */
export function safeRedirect(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || value.startsWith('/\\'))
    return HOME_PATH;
  const pathname = value.split(/[?#]/, 1)[0] ?? '';
  if (GUEST_PATHS.includes(pathname)) return HOME_PATH;
  return value;
}

/** `/login?redirect=<path>` for a page the visitor wasn't allowed to see yet (AUTH-5, AUTH-6). */
export function loginPath(redirectTo?: string): string {
  if (!redirectTo || redirectTo === '/') return '/login';
  return `/login?${new URLSearchParams({ redirect: safeRedirect(redirectTo) }).toString()}`;
}

/** Carries `?redirect=` between Log in, Sign up and Forgot password, so it survives a detour. */
export function withRedirect(path: string, search: URLSearchParams): string {
  const redirect = search.get('redirect');
  return redirect ? `${path}?${new URLSearchParams({ redirect }).toString()}` : path;
}
