import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { STORAGE_KEYS } from '@/lib/storage';
import { useAnnouncer } from './announcer';
import { useSession } from './session';
import { useTheme } from './theme';
import { toast, useToast } from './toast';

describe('session store', () => {
  it('persists only the token', () => {
    useSession.getState().signIn('abc');
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.token) ?? '{}') as {
      state: Record<string, unknown>;
    };
    expect(saved.state).toEqual({ token: 'abc' });
  });

  it('expire() clears the token and flags the session as expired', () => {
    useSession.getState().signIn('abc');
    useSession.getState().expire();
    expect(useSession.getState()).toMatchObject({ token: null, sessionExpired: true });
  });

  it('signOut() clears the token, the UI stores and the query cache', () => {
    useSession.getState().signIn('abc');
    toast.success('Saved');
    useAnnouncer.getState().announce('Moved');
    queryClient.setQueryData(['projects'], []);

    useSession.getState().signOut();

    expect(useSession.getState()).toMatchObject({ token: null, sessionExpired: false });
    expect(useToast.getState().toast).toBeNull();
    expect(useAnnouncer.getState().message).toBe('');
    expect(queryClient.getQueryData(['projects'])).toBeUndefined();
  });
});

describe('toast store', () => {
  it('shows one toast at a time; a new one replaces the current one', () => {
    toast.success('First');
    const id = toast.error('Second');
    expect(useToast.getState().toast).toMatchObject({ id, kind: 'error', message: 'Second' });
  });

  it('dismiss(id) ignores a toast that was already replaced', () => {
    const first = toast.info('First');
    toast.info('Second');
    toast.dismiss(first);
    expect(useToast.getState().toast?.message).toBe('Second');
    toast.dismiss();
    expect(useToast.getState().toast).toBeNull();
  });
});

describe('announcer store', () => {
  it('bumps the id so the same message is announced again', () => {
    const { announce } = useAnnouncer.getState();
    announce('KAN-1 moved');
    const firstId = useAnnouncer.getState().id;
    announce('KAN-1 moved');
    expect(useAnnouncer.getState().id).toBe(firstId + 1);
  });
});

describe('theme store', () => {
  afterEach(() => {
    vi.useRealTimers();
    useTheme.setState({ theme: 'light' });
    document.documentElement.className = 'light';
  });

  it('toggle() swaps the <html> class, cross-fades for 300ms and persists the choice', () => {
    vi.useFakeTimers();
    document.documentElement.className = 'light';
    useTheme.setState({ theme: 'light' });

    useTheme.getState().toggle();

    const root = document.documentElement;
    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('light')).toBe(false);
    expect(root.classList.contains('theming')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(root.classList.contains('theming')).toBe(false);

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.theme) ?? '{}') as {
      state: Record<string, unknown>;
    };
    expect(saved.state).toEqual({ theme: 'dark' });
  });
});
