import { expect, test } from '@playwright/test';
import { column, openSignedIn, projectWithActiveSprint, registerViaApi } from './support';

// DESIGN §13 / NFR-4 at a 390px phone: the mobile top bar with the hamburger instead of the
// sidebar, and board columns 85vw wide that scroll sideways with snapping.
test.use({ viewport: { width: 390, height: 844 } });

test('390px: mobile nav and 85vw board columns (NFR-4)', async ({ page, request }) => {
  const { api } = await registerViaApi(request);
  const { project } = await projectWithActiveSprint(api);
  await openSignedIn(page, api.token, `/projects/${project.id}/board`);
  await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();

  // The page itself never scrolls sideways; only the board does.
  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);

  const todo = column(page, 'To Do');
  const width = (await todo.boundingBox())?.width ?? 0;
  expect(width).toBeGreaterThan(390 * 0.85 - 4);
  expect(width).toBeLessThan(390 * 0.85 + 4);
  await expect(column(page, 'Done')).not.toBeInViewport();
  // The nearest ancestor that really scrolls sideways (the grid inside it is wider too, but
  // doesn't scroll), and it snaps on x.
  const scroller = await todo.evaluate((el) => {
    let node = el.parentElement;
    while (node && !/auto|scroll/.test(getComputedStyle(node).overflowX)) node = node.parentElement;
    return node
      ? {
          snap: getComputedStyle(node).scrollSnapType,
          scrolls: node.scrollWidth > node.clientWidth,
        }
      : null;
  });
  expect(scroller?.scrolls).toBe(true);
  expect(scroller?.snap).toContain('x');

  // The sidebar is hidden; the hamburger opens the nav and any navigation closes it.
  const main = page.getByRole('navigation', { name: 'Main' });
  await expect(main).toBeHidden();
  const hamburger = page.getByRole('button', { name: 'Navigation' });
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  await hamburger.click();
  await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
  await expect(main).toBeVisible();
  await main.getByRole('link', { name: 'Backlog', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Backlog', level: 1 })).toBeVisible();
  await expect(main).toBeHidden();
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
});
