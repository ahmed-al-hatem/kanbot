import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (plan §6 phases 8–9). `npm run e2e` starts both servers itself:
 *
 * - the API (`npm run dev` in ../server) with `NODE_ENV=test` — which turns off its auth and AI
 *   rate limits, so many fresh sign-ups in a row are fine — its own data file, so a run never
 *   touches `server/data/db.json`, and mock AI unless `E2E_REAL_AI=1`;
 * - the client as a production build (`npm run build && npm run preview`, port 4173), whose
 *   `/api` proxy keeps every request same-origin (plan §9.1: the server only allows CORS from 5173).
 *   Built with `VITE_FEATURE_AR=true`, as in production since R5, so Arabic can be switched on.
 *
 * Two projects: `chromium` runs the English specs as they always ran (a new visitor is English);
 * `chromium-ar` runs the `*.ar.spec.ts` specs with Arabic saved before the first page, so the app
 * starts in Arabic and RTL (demo flow, board keys and edge scroll, 390px, axe light + dark).
 *
 * Outside CI an already-running server or preview is reused as it is (then its own `.env` decides
 * the AI mode; the AI assertions stay structural when it is a real model). Every test registers a
 * fresh user, so no `npm run seed` is needed and nothing is wiped.
 */
const CI = Boolean(process.env.CI);
const API_HEALTH = 'http://localhost:4000/api/health';
const CLIENT = 'http://localhost:4173';
/** The Arabic choice as `stores/locale.ts` persists it (zustand `persist`, version 0). */
const ARABIC_STORAGE = {
  name: 'kanbot.locale',
  value: JSON.stringify({ state: { locale: 'ar' }, version: 0 }),
};

export default defineConfig({
  testDir: './e2e',
  // One server and one JSON file database: the specs run in parallel files, each on its own user.
  fullyParallel: false,
  workers: CI ? 2 : undefined,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: CLIENT,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /\.ar\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-ar',
      testMatch: /\.ar\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        // The locale the switcher saves: index.html sets lang / dir from it before first paint.
        storageState: {
          cookies: [],
          origins: [{ origin: CLIENT, localStorage: [ARABIC_STORAGE] }],
        },
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../server',
      url: API_HEALTH,
      reuseExistingServer: !CI,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PORT: '4000',
        DATA_FILE: './data/e2e-db.json',
        // Mock AI unless asked otherwise: dotenv never overrides a variable that is already set.
        ...(process.env.E2E_REAL_AI ? {} : { AI_API_KEY: '' }),
      },
    },
    {
      command: 'npm run build && npm run preview',
      url: CLIENT,
      reuseExistingServer: !CI,
      timeout: 180_000,
      // Arabic on, as in production (a reused local preview must have been built with it too).
      env: { VITE_FEATURE_AR: 'true' },
    },
  ],
});
