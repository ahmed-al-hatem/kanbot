import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, openSignedIn, registerViaApi, seedHistory } from './support';

/**
 * axe (WCAG 2.1 A + AA, color-contrast on) on every main surface, in light and dark (DESIGN §15,
 * plan §6 phase 8). The theme follows the OS until the user picks one, so `colorScheme` sets it.
 * Reduced motion makes entry animations 1ms, so axe never measures text in the middle of a fade.
 */

async function check(page: Page, where: string, ready: () => Promise<void>) {
  await test.step(where, async () => {
    await ready();
    await expectNoA11yViolations(page, where);
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    test(`guest pages are axe-clean (${scheme})`, async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${scheme}\\b`));
      await check(page, `login (${scheme})`, () =>
        expect(page.getByRole('heading', { name: 'Welcome back', level: 1 })).toBeVisible(),
      );

      await page.goto('/register');
      await check(page, `register (${scheme})`, () =>
        expect(page.getByRole('heading', { name: 'Create your account', level: 1 })).toBeVisible(),
      );

      await page.goto('/no-such-page');
      await check(page, `404 signed out (${scheme})`, () =>
        expect(page.getByRole('heading', { name: "We can't find that page" })).toBeVisible(),
      );
    });

    test(`app pages, the todo dialog and the AI drawer are axe-clean (${scheme})`, async ({
      page,
      request,
    }) => {
      test.setTimeout(120_000);
      const { api } = await registerViaApi(request);
      const { project, completedId, todoId } = await seedHistory(api);
      const base = `/projects/${project.id}`;

      await openSignedIn(page, api.token, '/projects');
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${scheme}\\b`));
      await check(page, `projects (${scheme})`, () =>
        expect(page.getByRole('heading', { name: 'Accessibility Check' })).toBeVisible(),
      );

      await page.goto(`${base}/backlog`);
      await check(page, `backlog (${scheme})`, async () => {
        await expect(page.getByRole('button', { name: 'Toggle Sprint 3' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Profile page', exact: true })).toBeVisible();
      });

      await page.goto(`${base}/backlog?todo=${todoId}`);
      await check(page, `todo dialog (${scheme})`, async () => {
        const dialog = page.getByRole('dialog', { name: /Crash on empty search|-\d+/ });
        await expect(dialog.getByRole('textbox', { name: /^Title/ })).toHaveValue(
          'Crash on empty search',
        );
      });

      await page.goto(`${base}/backlog`);
      await check(page, `AI drawer with a chat (${scheme})`, async () => {
        await page.getByRole('button', { name: 'Ask AI', exact: true }).click();
        const drawer = page.getByRole('dialog', { name: 'Kanbot Assistant' });
        await drawer
          .getByRole('textbox', { name: 'Message Kanbot' })
          .fill('What should I work on next?');
        await page.keyboard.press('Enter');
        const log = drawer.getByRole('log', { name: 'Conversation' });
        await expect(log.getByRole('button', { name: 'Copy' })).toBeVisible({ timeout: 45_000 });
      });

      await page.goto(`${base}/board`);
      await check(page, `board (${scheme})`, async () => {
        await expect(page.getByRole('heading', { name: 'Sprint 2', level: 2 })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Done, 1 todo' })).toBeVisible();
      });

      await page.goto(`${base}/sprints`);
      await check(page, `sprints, active sprint (${scheme})`, () =>
        expect(page.getByRole('region', { name: 'Sprint 2', exact: true })).toBeVisible(),
      );

      await page.goto(`${base}/sprints/${completedId}`);
      await check(page, `sprints, completed sprint with its summary (${scheme})`, async () => {
        const summary = page.getByRole('region', { name: 'AI summary' });
        await expect(summary.getByText(/^Generated /).first()).toBeVisible();
      });

      await page.goto('/no-such-page');
      await check(page, `404 in the app (${scheme})`, () =>
        expect(page.getByRole('heading', { name: "We can't find that page" })).toBeVisible(),
      );
    });
  });
}
