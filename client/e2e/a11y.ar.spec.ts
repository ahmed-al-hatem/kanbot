import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations, openSignedIn, registerViaApi, seedHistory } from './support';

/**
 * a11y.spec.ts in Arabic (R5): axe (WCAG 2.1 A + AA, color-contrast on) on every main surface of
 * the RTL app, in light and dark — the same pages and the same seed as the English run.
 */

async function check(page: Page, where: string, ready: () => Promise<void>) {
  await test.step(where, async () => {
    await ready();
    await expectNoA11yViolations(page, where);
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} theme, Arabic`, () => {
    test.use({ colorScheme: scheme, reducedMotion: 'reduce' });

    test(`guest pages are axe-clean in Arabic (${scheme})`, async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveClass(new RegExp(`\\b${scheme}\\b`));
      await check(page, `login (${scheme}, ar)`, () =>
        expect(page.getByRole('heading', { name: 'أهلًا بعودتك', level: 1 })).toBeVisible(),
      );

      await page.goto('/register');
      await check(page, `register (${scheme}, ar)`, () =>
        expect(page.getByRole('heading', { name: 'أنشئ حسابك', level: 1 })).toBeVisible(),
      );

      await page.goto('/no-such-page');
      await check(page, `404 signed out (${scheme}, ar)`, () =>
        expect(page.getByRole('heading', { name: 'لم نعثر على هذه الصفحة' })).toBeVisible(),
      );
    });

    test(`app pages, the todo dialog and the AI drawer are axe-clean in Arabic (${scheme})`, async ({
      page,
      request,
    }) => {
      test.setTimeout(120_000);
      const { api } = await registerViaApi(request);
      const { project, completedId, todoId } = await seedHistory(api);
      const base = `/projects/${project.id}`;

      await openSignedIn(page, api.token, '/projects');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await check(page, `projects (${scheme}, ar)`, () =>
        expect(page.getByRole('heading', { name: 'Accessibility Check' })).toBeVisible(),
      );

      await page.goto(`${base}/backlog`);
      await check(page, `backlog (${scheme}, ar)`, async () => {
        await expect(page.getByRole('button', { name: 'إظهار أو إخفاء Sprint 3' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Profile page', exact: true })).toBeVisible();
      });

      await page.goto(`${base}/backlog?todo=${todoId}`);
      await check(page, `todo dialog (${scheme}, ar)`, async () => {
        const dialog = page.getByRole('dialog', { name: /Crash on empty search|-\d+/ });
        await expect(dialog.getByRole('textbox', { name: /^العنوان/ })).toHaveValue(
          'Crash on empty search',
        );
      });

      await page.goto(`${base}/backlog`);
      await check(page, `AI drawer with a chat (${scheme}, ar)`, async () => {
        await page.getByRole('button', { name: 'اسأل الذكاء الاصطناعي', exact: true }).click();
        const drawer = page.getByRole('dialog', { name: 'مساعد Kanbot' });
        await drawer
          .getByRole('textbox', { name: 'راسل Kanbot' })
          .fill('ما الذي أعمل عليه تاليًا؟');
        await page.keyboard.press('Enter');
        const log = drawer.getByRole('log', { name: 'المحادثة' });
        await expect(log.getByRole('button', { name: 'نسخ' })).toBeVisible({ timeout: 45_000 });
      });

      await page.goto(`${base}/board`);
      await check(page, `board (${scheme}, ar)`, async () => {
        await expect(page.getByRole('heading', { name: 'Sprint 2', level: 2 })).toBeVisible();
        await expect(page.getByRole('region', { name: 'منجز، بند واحد' })).toBeVisible();
      });

      await page.goto(`${base}/sprints`);
      await check(page, `sprints, active sprint (${scheme}, ar)`, () =>
        expect(page.getByRole('region', { name: 'Sprint 2', exact: true })).toBeVisible(),
      );

      await page.goto(`${base}/sprints/${completedId}`);
      await check(page, `sprints, completed sprint with its summary (${scheme}, ar)`, async () => {
        const summary = page.getByRole('region', { name: 'ملخص الذكاء الاصطناعي' });
        await expect(summary.getByText(/^وُلّد في /).first()).toBeVisible();
      });

      await page.goto('/no-such-page');
      await check(page, `404 in the app (${scheme}, ar)`, () =>
        expect(page.getByRole('heading', { name: 'لم نعثر على هذه الصفحة' })).toBeVisible(),
      );
    });
  });
}
