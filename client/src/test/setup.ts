import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { useAnnouncer } from '@/stores/announcer';
import { useSession } from '@/stores/session';
import { useToast } from '@/stores/toast';
import { server } from './server';

// jsdom has no ResizeObserver; Radix popper content (menus) measures itself with one.
class ResizeObserverStub implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = ResizeObserverStub;

// Any request without a handler fails the test instead of hitting the network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  window.localStorage.clear();
  useSession.setState({ token: null, sessionExpired: false });
  useToast.setState({ toast: null });
  useAnnouncer.setState({ message: '', politeness: 'polite', id: 0 });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  queryClient.clear();
});

afterAll(() => {
  server.close();
});
