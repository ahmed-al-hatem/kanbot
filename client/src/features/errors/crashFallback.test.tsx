import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as I18nModule from '@/i18n';
import { AppErrorBoundary } from './AppErrorBoundary';

// The dictionary itself is broken: reading the messages throws.
vi.mock('@/i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nModule>()),
  getT: () => {
    throw new Error('The dictionary failed to load');
  },
}));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AppErrorBoundary when the messages fail', () => {
  it('falls back to the bundled English crash screen', () => {
    function Boom(): never {
      throw new Error('Crashed');
    }
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: 'Something went wrong', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Projects' })).toBeInTheDocument();
    expect(document.title).toBe('Something went wrong · Kanbot');
  });
});
