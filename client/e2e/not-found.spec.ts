import { expect, test } from '@playwright/test';
import { openSignedIn, registerViaApi } from './support';

// REQUIREMENTS §5 "Not found": a friendly 404 with a link home (DESIGN §9, canvas S09 / M04).

test('404 inside the app: unknown route and missing project', async ({ page, request }) => {
  const { api } = await registerViaApi(request);
  await openSignedIn(page, api.token, '/no-such-page');

  await expect(page.getByRole('heading', { name: "We can't find that page", level: 1 })).toBeVisible();
  await expect(page.getByText('Error 404', { exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Page not found · Kanbot');
  // Rendered in place, not redirected; the shell stays with no current nav item.
  await expect(page).toHaveURL('/no-such-page');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav).toBeVisible();
  await expect(nav.locator('[aria-current="page"]')).toHaveCount(0);

  await page.getByRole('link', { name: 'Go to Projects' }).click();
  await expect(page).toHaveURL('/projects');
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

  await page.goto('/projects/00000000-0000-0000-0000-000000000000/backlog');
  await expect(page.getByRole('heading', { name: "This project doesn't exist", level: 1 })).toBeVisible();
});

test('404 signed out: centered page, no shell', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: "We can't find that page", level: 1 })).toBeVisible();
  await expect(page).toHaveURL('/no-such-page');
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Go to Projects' })).toBeVisible();
});
