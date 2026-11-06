import { expect, test } from '@playwright/test';
import { AR_STATUS, arColumn } from './arabic';
import { card, nextMove, openSignedIn, projectWithActiveSprint, registerViaApi } from './support';

/**
 * The board in Arabic (R5): keyboard moves follow the columns as drawn (right to left), and a
 * drag toward the left edge scrolls the column strip — which dnd-kit can't do in RTL on its own
 * (lib/dnd/HorizontalEdgeScroll.tsx).
 */
test('keyboard: ← moves to the next column, → back, and the first column says so', async ({
  page,
  request,
}) => {
  const { api } = await registerViaApi(request);
  const { project, todos } = await projectWithActiveSprint(api);
  await openSignedIn(page, api.token, `/projects/${project.id}/board`);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

  const title = todos[0]?.title ?? '';
  await card(page, title).focus();

  let moved = nextMove(page);
  await page.keyboard.press('ArrowLeft');
  expect((await moved).ok()).toBe(true);
  await expect(card(arColumn(page, AR_STATUS.in_progress), title)).toBeFocused();

  moved = nextMove(page);
  await page.keyboard.press('ArrowRight');
  expect((await moved).ok()).toBe(true);
  await expect(card(arColumn(page, AR_STATUS.todo), title)).toBeFocused();

  // To Do is the first column, drawn on the right: → can't go further.
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('live-polite')).toContainText(`في ${AR_STATUS.todo} بالفعل`);
  await expect(card(arColumn(page, AR_STATUS.todo), title)).toBeFocused();
});

test.describe('a narrow board', () => {
  // The icon rail (761–1023px): the four columns (980px min) are wider than the page.
  test.use({ viewport: { width: 900, height: 900 } });

  test('dragging a card to the left edge scrolls the columns, then it drops on Done', async ({
    page,
    request,
  }) => {
    const { api } = await registerViaApi(request);
    const { project, todos } = await projectWithActiveSprint(api);
    await openSignedIn(page, api.token, `/projects/${project.id}/board`);
    const title = todos[0]?.title ?? '';
    const source = card(page, title);
    await expect(source).toBeVisible();

    // The strip that scrolls sideways (the nearest ancestor with overflow-x, as in mobile.spec):
    // RTL starts at scrollLeft 0 (its right end) and goes negative toward the left.
    const strip = () =>
      arColumn(page, AR_STATUS.todo).evaluate((el) => {
        let node = el.parentElement;
        while (node && !/auto|scroll/.test(getComputedStyle(node).overflowX))
          node = node.parentElement;
        if (!node) throw new Error('no horizontal scroller');
        return {
          left: node.getBoundingClientRect().left,
          scrollLeft: node.scrollLeft,
          scrolls: node.scrollWidth > node.clientWidth,
        };
      });
    const start = await strip();
    expect(start.scrolls).toBe(true);
    expect(start.scrollLeft).toBe(0);

    const from = await source.boundingBox();
    if (!from) throw new Error('board not laid out');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 - 8, from.y + 8, { steps: 4 });
    // Hold the card at the left edge until the strip has scrolled to its end.
    await page.mouse.move(start.left + 12, from.y + 40, { steps: 16 });
    await expect.poll(async () => (await strip()).scrollLeft, { timeout: 5_000 }).toBeLessThan(-50);

    const done = await arColumn(page, AR_STATUS.done).boundingBox();
    if (!done) throw new Error('Done column not laid out');
    const moved = nextMove(page);
    await page.mouse.move(done.x + done.width / 2, done.y + 80, { steps: 8 });
    await page.mouse.up();
    expect((await moved).ok()).toBe(true);
    await expect(card(arColumn(page, AR_STATUS.done), title)).toBeVisible();
  });
});
