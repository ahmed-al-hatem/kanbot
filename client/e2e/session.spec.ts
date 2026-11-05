import { expect, test } from '@playwright/test';
import { openSignedIn, projectWithActiveSprint, registerViaApi, removeToken } from './support';

// IMPLEMENTATION-PLAN §6 QA: "Reload on /projects/:id/board → still there. Remove the token →
// back to login with ?redirect= → log in → back on the board." (AUTH-2, AUTH-3, AUTH-5)

test('the session survives a reload (AUTH-3)', async ({ page, request }) => {
  const { api } = await registerViaApi(request);
  const { project } = await projectWithActiveSprint(api);
  const board = `/projects/${project.id}/board`;

  await openSignedIn(page, api.token, board);
  await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(board);
  await expect(page.getByRole('heading', { name: 'Active Sprint', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();
});

test('without a token: log in with ?redirect= and land back on the page (AUTH-2, AUTH-5)', async ({
  page,
  request,
}) => {
  const { api, user } = await registerViaApi(request);
  const { project } = await projectWithActiveSprint(api);
  const board = `/projects/${project.id}/board`;

  await openSignedIn(page, api.token, board);
  await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();

  await removeToken(page);
  await page.reload();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  expect(new URL(page.url()).searchParams.get('redirect')).toBe(board);

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();

  await expect(page).toHaveURL(board);
  await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();
});
