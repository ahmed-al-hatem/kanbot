import { expect, test } from '@playwright/test';
import {
  Api,
  card,
  column,
  escapeRegExp,
  newUser,
  nextMove,
  pointerDrag,
  storedToken,
} from './support';

const todosText = (n: number) => `${n} todo${n === 1 ? '' : 's'}`;

/**
 * REQUIREMENTS §8 deliverable 3, end to end through the UI only: register → create project →
 * generate todos with AI (uncheck some, edit one, add exactly those) → plan a sprint with AI
 * within capacity → create it → start it → move cards across every column by pointer drag and
 * by keyboard → progress follows → complete it (unfinished → Backlog, with the AI summary) →
 * the sprint's page shows the stats and the summary.
 *
 * In mock mode (the default, see playwright.config.ts) the AI's answers are known, so the exact
 * texts are checked too; with a real model only the structure is.
 */
test('demo flow: register → AI todos → AI plan → board → complete with summary', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const user = newUser();

  await test.step('register', async () => {
    await page.goto('/register');
    await page.getByLabel('Name').fill(user.name);
    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByLabel('Confirm password').fill(user.password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  });

  const api = new Api(request, await storedToken(page));
  const mock = (await api.aiMode()) === 'mock';

  await test.step('create a project', async () => {
    await page.getByRole('button', { name: 'Create your first project' }).click();
    const dialog = page.getByRole('dialog', { name: 'Create project' });
    await dialog.getByLabel(/Project name/).fill('Checkout Revamp');
    await dialog.getByRole('button', { name: 'Create project' }).click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/backlog$/);
    await expect(page.getByRole('heading', { name: 'Backlog', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your backlog is empty' })).toBeVisible();
  });

  const kept: string[] = [];
  const dropped: string[] = [];

  await test.step('generate todos with AI, uncheck two, edit one, add exactly those', async () => {
    await page.getByRole('button', { name: 'Generate todos' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Generate todos with AI' });
    await dialog.getByRole('textbox', { name: /Describe the feature/ }).fill('Checkout page');
    await dialog.getByRole('button', { name: 'Generate', exact: true }).click();

    const include = dialog.getByRole('checkbox', { name: /^Include / });
    await expect(include.first()).toBeVisible({ timeout: 45_000 });
    const count = await include.count();
    expect(count, 'drafts returned').toBeGreaterThanOrEqual(3);
    if (mock) expect(count).toBe(5);
    for (let i = 0; i < count; i++) await expect(include.nth(i)).toBeChecked();

    // Uncheck the last two drafts.
    for (const n of [count, count - 1]) {
      dropped.push(await dialog.getByRole('textbox', { name: `Title of draft ${n}` }).inputValue());
      await dialog.getByRole('checkbox', { name: `Include ${dropped.at(-1) ?? ''}` }).uncheck();
    }
    // Edit the first one's title.
    const firstTitle = dialog.getByRole('textbox', { name: 'Title of draft 1' });
    await firstTitle.fill('Design the checkout screens');
    for (let n = 1; n <= count - 2; n++) {
      kept.push(await dialog.getByRole('textbox', { name: `Title of draft ${n}` }).inputValue());
    }
    expect(kept[0]).toBe('Design the checkout screens');

    await dialog.getByRole('button', { name: `Add ${count - 2} todos to Backlog` }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(`${count - 2} todos added to the backlog`)).toBeVisible();

    const backlog = page.getByRole('list', { name: 'Backlog todos' });
    await expect(backlog.getByRole('listitem')).toHaveCount(kept.length);
    for (const title of kept)
      await expect(backlog.getByRole('button', { name: title, exact: true })).toBeVisible();
    for (const title of dropped)
      await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(0);
  });

  const capacity = 8;
  const planned: string[] = [];

  await test.step('plan a sprint with AI within capacity and create it', async () => {
    await page.getByRole('button', { name: 'Plan sprint' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Plan sprint with AI' });
    await dialog.getByRole('spinbutton', { name: /Capacity/ }).fill(String(capacity));
    await dialog.getByRole('button', { name: 'Suggest plan' }).click();

    await expect(dialog.getByRole('textbox', { name: 'Suggested sprint goal' })).toBeVisible({
      timeout: 45_000,
    });
    const total = dialog.getByText(new RegExp(`^\\d+ / ${capacity} pts$`)).first();
    await expect(total).toBeVisible();
    const points = Number((await total.textContent())?.split(' / ')[0]);
    expect(points, 'planned points').toBeLessThanOrEqual(capacity);

    // Mock plan over 2 / 5 / 3 points, all high priority: 2 + 5 fit in 8, the 3 doesn't.
    if (mock) expect(points).toBe(7);
    const create = dialog.getByRole('button', { name: /^Create Sprint 1 with \d+ todos?$/ });
    await expect(create).toBeEnabled();
    const label = (await create.textContent()) ?? '';
    const picked = Number(/with (\d+) todo/.exec(label)?.[1]);
    expect(picked).toBeGreaterThan(0);

    // Remember which todos are in the plan (checked rows, named by their label), to follow them.
    for (const title of kept) {
      const row = dialog.getByRole('checkbox', { name: new RegExp(escapeRegExp(title)) });
      if (await row.isChecked()) planned.push(title);
    }
    expect(planned).toHaveLength(picked);

    await create.click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText(new RegExp(`^Sprint 1 created with ${picked} todos?$`)),
    ).toBeVisible();
    const sprintList = page.getByRole('list', { name: 'Sprint 1 todos' });
    await expect(sprintList.getByRole('listitem')).toHaveCount(picked);
  });

  await test.step('start the sprint', async () => {
    await page.getByRole('button', { name: 'Start sprint', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Start Sprint 1' });
    await dialog.getByRole('button', { name: 'Start sprint', exact: true }).click();
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();
    await expect(column(page, 'To Do')).toHaveAccessibleName(`To Do, ${planned.length} todos`);
  });

  // Needs two todos: one goes all the way by pointer, the other by keyboard and stays unfinished.
  expect(planned.length, 'todos in the sprint').toBeGreaterThanOrEqual(2);
  const [dragged = '', keyed = ''] = planned;
  const pointsBar = page.getByRole('progressbar', { name: 'Sprint 1 points done' });
  const todosBar = page.getByRole('progressbar', { name: 'Sprint 1 todos done' });

  await test.step('move a card across every column with a pointer drag', async () => {
    await expect(pointsBar).toHaveAttribute('aria-valuenow', '0');
    for (const to of ['In Progress', 'In Review', 'Done']) {
      const moved = nextMove(page);
      await pointerDrag(page, card(page, dragged), column(page, to));
      expect((await moved).ok()).toBe(true);
      await expect(card(column(page, to), dragged)).toBeVisible();
    }
    // Dropping isn't a click: no Todo details opened on the way.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(todosBar).toHaveAttribute('aria-valuenow', '1');
    await expect(pointsBar).not.toHaveAttribute('aria-valuenow', '0');
  });

  await test.step('move another card across every column with the keyboard', async () => {
    await card(page, keyed).focus();
    for (const to of ['In Progress', 'In Review', 'Done']) {
      const moved = nextMove(page);
      await page.keyboard.press('ArrowRight');
      expect((await moved).ok()).toBe(true);
      await expect(card(column(page, to), keyed)).toBeVisible();
      // Focus stays on the moved card (DESIGN §10.3).
      await expect(card(column(page, to), keyed)).toBeFocused();
    }
    await expect(todosBar).toHaveAttribute('aria-valuenow', '2');
    // …and back to In Review, so it is unfinished when the sprint completes.
    const moved = nextMove(page);
    await page.keyboard.press('ArrowLeft');
    expect((await moved).ok()).toBe(true);
    await expect(card(column(page, 'In Review'), keyed)).toBeFocused();
    await expect(todosBar).toHaveAttribute('aria-valuenow', '1');
  });

  await test.step('complete the sprint: unfinished to the backlog, with the AI summary', async () => {
    await page.getByRole('button', { name: 'Complete sprint', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Complete Sprint 1' });
    await expect(dialog.getByRole('radio', { name: 'Backlog', exact: true })).toBeChecked();
    await dialog.getByRole('checkbox', { name: /Generate AI summary/ }).check();
    await dialog.getByRole('button', { name: 'Complete sprint', exact: true }).click();
    await expect(page).toHaveURL(/\/sprints\/[^/]+$/);
  });

  await test.step("the sprint's page shows the stats and the summary", async () => {
    const detail = page.getByRole('region', { name: 'Sprint 1', exact: true });
    await expect(detail).toBeVisible();
    // A stat tile's text is its label followed by its value ("Completed" is also the lozenge).
    const tile = (label: string, value: string) =>
      detail.getByText(new RegExp(`^${label}\\s*${value}$`));
    await expect(tile('Completed', todosText(1))).toBeVisible();
    await expect(tile('Carried over', todosText(planned.length - 1))).toBeVisible();
    await expect(tile('Completion', '\\d+%')).toBeVisible();
    // Playwright's getByRole has no `current` option; the selected sprint is the aria-current link.
    const selected = page
      .getByRole('navigation', { name: 'All sprints' })
      .locator('a[aria-current="page"]');
    await expect(selected).toContainText('Completed');

    const summary = page.getByRole('region', { name: 'AI summary' });
    await expect(summary.getByText(/^Generated /).first()).toBeVisible({ timeout: 45_000 });
    if (mock)
      await expect(summary.getByRole('heading', { name: 'Sprint 1 summary' })).toBeVisible();
    await expect(summary).toContainText('AI can make mistakes');
  });

  await test.step('the unfinished todo is back in the backlog', async () => {
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Backlog', exact: true })
      .click();
    const backlog = page.getByRole('list', { name: 'Backlog todos' });
    await expect(backlog.getByRole('button', { name: keyed, exact: true })).toBeVisible();
    await expect(backlog.getByRole('button', { name: dragged, exact: true })).toHaveCount(0);
  });
});
