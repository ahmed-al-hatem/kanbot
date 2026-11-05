import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { stopRefocus } from '@/lib/refocus';
import { useAnnouncer } from '@/stores/announcer';
import { useAssistant } from '@/stores/assistant';
import { useHighlight } from '@/stores/highlight';
import { useSession } from '@/stores/session';
import { useToast } from '@/stores/toast';
import { server } from './server';

// The page tests render the real routes, whose pages are lazy chunks: the first render of each
// file compiles and loads them cold. On a busy machine that alone took longer than Testing
// Library's default 1s wait, so every findBy* / waitFor gets 4s (they still resolve as soon as
// the element appears). The per-test limit is raised to match in vitest.config.ts.
configure({ asyncUtilTimeout: 4000 });

// jsdom has no ResizeObserver; Radix popper content (menus) measures itself with one.
class ResizeObserverStub implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
globalThis.ResizeObserver = ResizeObserverStub;

// jsdom doesn't implement scrolling; React Router's ScrollRestoration calls it on navigation.
window.scrollTo = vi.fn() as typeof window.scrollTo;

// Any request without a handler fails the test instead of hitting the network.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  window.localStorage.clear();
  useSession.setState({ token: null, sessionExpired: false, signedOut: false });
  useToast.setState({ toast: null });
  useAnnouncer.setState({ message: '', politeness: 'polite', id: 0 });
  useAssistant.setState({ open: false, chats: {}, composer: {}, dialog: null });
  useHighlight.setState({ projectId: null, todoIds: [] });
});

afterEach(() => {
  // A focus watch left from a delete must not outlive its test (or jsdom: "document is not defined").
  stopRefocus();
  cleanup();
  server.resetHandlers();
  queryClient.clear();
});

afterAll(() => {
  server.close();
});
