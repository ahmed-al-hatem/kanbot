import { setupServer } from 'msw/node';

/** MSW server shared by all tests. Add handlers per test with `server.use(...)`. */
export const server = setupServer();

/** Absolute URL of an API path as the client builds it (jsdom origin + VITE_API_URL). */
export const apiUrl = (path: string) =>
  new URL(`${import.meta.env.VITE_API_URL ?? '/api'}${path}`, window.location.origin).toString();
