import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchMe, login, register } from '@/api/auth';
import { queryClient } from '@/app/queryClient';
import { useSession } from '@/stores/session';
import { toast } from '@/stores/toast';
import type { AuthResponse } from '@/types/api';
import { qk } from './queryKeys';

/**
 * The signed-in user (`GET /auth/me`). Runs only while there is a token; a 401 here expires
 * the session through api/client.ts like any other request (AUTH-3, AUTH-6).
 */
export function useCurrentUser() {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: qk.me,
    queryFn: ({ signal }) => fetchMe(signal),
    enabled: Boolean(token),
  });
}

/** Every sign-in starts from an empty cache, so nothing from a previous user can show. */
function startSession({ token, user }: AuthResponse) {
  queryClient.clear();
  queryClient.setQueryData(qk.me, user);
  useSession.getState().signIn(token);
}

/** POST /auth/login. On success the guest guard sends the user to `?redirect=` (AUTH-2). */
export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: startSession,
  });
}

/** POST /auth/register, then signed in with a welcome toast (AUTH-1, DESIGN §9 02). */
export function useRegister() {
  return useMutation({
    mutationFn: register,
    onSuccess: (response) => {
      startSession(response);
      const firstName = response.user.name.trim().split(/\s+/)[0] ?? response.user.name;
      toast.success(`Welcome to Kanbot, ${firstName}`);
    },
  });
}

/**
 * Log out is client-side only (IMPLEMENTATION-PLAN §4.4): forget the token, the UI stores and
 * the cache. The private guard then routes to `/login` (AUTH-4).
 */
export function useLogout() {
  return useSession((s) => s.signOut);
}
