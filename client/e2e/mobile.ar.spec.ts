import { expect, test } from '@playwright/test';
import { AR_STATUS, arColumn, mainNav } from './arabic';
import { openSignedIn, projectWithActiveSprint, registerViaApi } from './support';

// mobile.spec.ts in Arabic (R5) at a 390px phone: the hamburger nav, 85vw columns that start at
// the right edge and scroll sideways with snapping, and no page overflow in RTL.
test.use({ viewport: { width: 390, height: 844 } });

test('390px in Arabic: mobile nav and 85vw board columns from the right (NFR-4)', async ({
  page,
  request,
}) => {
  const { api } = await registerViaApi(request);
  const { project } = await projectWithActiveSprint(api);
  await openSignedIn(page, api.token, `/projects/${project.id}/board`);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);

  // The first column (To Do) is 85vw and sits against the right edge; Done is off to the left.
  const todo = arColumn(page, AR_STATUS.todo);
  const box = await todo.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(390 * 0.85 - 4);
  expect(box?.width ?? 0).toBeLessThan(390 * 0.85 + 4);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeGreaterThan(390 - 24);
  await expect(arColumn(page, AR_STATUS.done)).not.toBeInViewport();

  const scroller = await todo.evaluate((el) => {
    let node = el.parentElement;
    while (node && !/auto|scroll/.test(getComputedStyle(node).overflowX)) node = node.parentElement;
    return node
      ? {
          snap: getComputedStyle(node).scrollSnapType,
          scrolls: node.scrollWidth > node.clientWidth,
          scrollLeft: node.scrollLeft,
        }
      : null;
  });
  expect(scroller?.scrolls).toBe(true);
  expect(scroller?.snap).toContain('x');
  // RTL: the strip starts at its right end.
  expect(scroller?.scrollLeft).toBe(0);

  const main = mainNav(page);
  await expect(main).toBeHidden();
  const hamburger = page.getByRole('button', { name: 'التنقل' });
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  await hamburger.click();
  await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
  await expect(main).toBeVisible();
  await main.getByRole('link', { name: 'قائمة الانتظار', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'قائمة الانتظار', level: 1 })).toBeVisible();
  await expect(main).toBeHidden();
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
});
