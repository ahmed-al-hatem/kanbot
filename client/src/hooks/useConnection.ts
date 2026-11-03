import { onlineManager, useMutation } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { getHealth } from '@/api/health';

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const getSnapshot = () => onlineManager.isOnline();

/**
 * TanStack Query's own online state (plan §2 #13): while it is false, queries and mutations
 * pause and resume by themselves on reconnect.
 */
export function useOnline() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * "Retry now" on the offline banner: pings `/health` and, if the server answers, tells
 * TanStack Query it is online again, which resumes the paused queries and mutations.
 */
export function useRetryConnection() {
  return useMutation({
    mutationFn: () => getHealth(),
    // A paused mutation would wait for the very connection it is checking.
    networkMode: 'always',
    onSuccess: () => {
      onlineManager.setOnline(true);
    },
  });
}
