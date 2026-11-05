import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';
import type * as ChunkErrorModule from './chunkError';
import { isChunkLoadError, reloadPage } from './chunkError';
import { RouteErrorBoundary } from './RouteErrorBoundary';

// jsdom's location.reload can't be spied on; the boundaries call it through this module.
vi.mock('./chunkError', async (importOriginal) => ({
  ...(await importOriginal<typeof ChunkErrorModule>()),
  reloadPage: vi.fn(),
}));

beforeEach(() => {
  // React and React Router report caught errors on the console; that's expected here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(reloadPage).mockClear();
});

const CHUNK_MESSAGE = 'Failed to fetch dynamically imported module: http://localhost/assets/BoardPage-Dx1.js';

describe('isChunkLoadError', () => {
  it('recognises each browser’s failed dynamic import and nothing else', () => {
    expect(isChunkLoadError(new TypeError(CHUNK_MESSAGE))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: /a.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/Board.css'))).toBe(true);
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
  });
});

describe('RouteErrorBoundary (plan §9.3)', () => {
  it('asks for a reload when a lazy route chunk is gone after a deploy', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        path: '/',
        ErrorBoundary: RouteErrorBoundary,
        hydrateFallbackElement: <p>Loading</p>,
        lazy: () => Promise.reject(new TypeError(CHUNK_MESSAGE)),
      },
    ]);
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'A new version is available', level: 1 })).toBeInTheDocument();
    expect(document.title).toBe('Update available · Kanbot');
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('shows the page error for other errors, and Try again renders the page again', async () => {
    const user = userEvent.setup();
    let fail = true;
    function Flaky() {
      if (fail) throw new Error('Render failed');
      return <h1>Recovered</h1>;
    }
    const router = createMemoryRouter([{ path: '/', ErrorBoundary: RouteErrorBoundary, Component: Flaky }]);
    render(<RouterProvider router={router} />);

    // The page error is a lazy chunk (kept out of the startup bundle); its cold import can be slow.
    expect(
      await screen.findByRole('heading', { name: 'Something went wrong', level: 1 }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "We couldn't load this page" })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Recovered' })).toBeInTheDocument();
  });
});

describe('AppErrorBoundary (friendly crash screen)', () => {
  function Boom(): never {
    throw new Error('Crashed outside the router');
  }

  it('replaces the app with a crash screen offering Reload and Projects', async () => {
    const user = userEvent.setup();
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Projects' })).toHaveAttribute('href', '/projects');
    expect(document.title).toBe('Something went wrong · Kanbot');
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  it('says a new version is available for a chunk error', () => {
    function ChunkBoom(): never {
      throw new TypeError(CHUNK_MESSAGE);
    }
    render(
      <AppErrorBoundary>
        <ChunkBoom />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'A new version is available' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to Projects' })).not.toBeInTheDocument();
  });
});
