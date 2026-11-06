import { expect, test } from '@playwright/test';
import { AR_STATUS, arColumn, arTodos, mainNav } from './arabic';
import { Api, card, escapeRegExp, newUser, nextMove, pointerDrag, storedToken } from './support';

/**
 * The demo flow of demo-flow.spec.ts in Arabic (R5), through the UI only, on the RTL page:
 * register → project → AI todos → AI plan → start → a card across every column by pointer drag
 * and another by keyboard (← is the next column in RTL) → complete with the AI summary → the
 * sprint's page. Mock AI by default; its replies are the server's English text.
 */
test('demo flow in Arabic (RTL)', async ({ page, request }) => {
  test.setTimeout(120_000);
  const user = newUser();

  await test.step('register', async () => {
    await page.goto('/register');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await page.getByLabel('الاسم', { exact: true }).fill(user.name);
    const email = page.getByLabel('البريد الإلكتروني', { exact: true });
    await expect(email).toHaveAttribute('dir', 'ltr');
    await email.fill(user.email);
    await page.getByLabel('كلمة المرور', { exact: true }).fill(user.password);
    await page.getByLabel('تأكيد كلمة المرور', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'إنشاء حساب' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('heading', { name: 'المشاريع', level: 1 })).toBeVisible();
  });

  const api = new Api(request, await storedToken(page));
  const mock = (await api.aiMode()) === 'mock';

  await test.step('create a project', async () => {
    await page.getByRole('button', { name: 'أنشئ مشروعك الأول' }).click();
    const dialog = page.getByRole('dialog', { name: 'إنشاء مشروع' });
    await dialog.getByLabel(/اسم المشروع/).fill('Checkout Revamp');
    await dialog.getByRole('button', { name: 'إنشاء مشروع' }).click();
    await expect(page).toHaveURL(/\/projects\/[^/]+\/backlog$/);
    await expect(page.getByRole('heading', { name: 'قائمة الانتظار', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'قائمة الانتظار فارغة' })).toBeVisible();
  });

  const kept: string[] = [];

  await test.step('generate todos with AI, uncheck two, edit one, add exactly those', async () => {
    await page.getByRole('button', { name: 'توليد البنود' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'توليد البنود بالذكاء الاصطناعي' });
    await dialog.getByRole('textbox', { name: /صف الميزة/ }).fill('صفحة الدفع');
    await dialog.getByRole('button', { name: 'توليد', exact: true }).click();

    const include = dialog.getByRole('checkbox', { name: /^تضمين / });
    await expect(include.first()).toBeVisible({ timeout: 45_000 });
    const count = await include.count();
    expect(count, 'drafts returned').toBeGreaterThanOrEqual(3);
    if (mock) expect(count).toBe(5);

    for (const n of [count, count - 1]) {
      const title = await dialog.getByRole('textbox', { name: `عنوان المسودة ${n}` }).inputValue();
      await dialog.getByRole('checkbox', { name: `تضمين ${title}` }).uncheck();
    }
    // An Arabic title among the Latin ones the mock AI writes: both directions in one list.
    await dialog.getByRole('textbox', { name: 'عنوان المسودة 1' }).fill('تصميم شاشات الدفع');
    for (let n = 1; n <= count - 2; n++) {
      kept.push(await dialog.getByRole('textbox', { name: `عنوان المسودة ${n}` }).inputValue());
    }

    await dialog.getByRole('button', { name: /^إضافة .* إلى قائمة الانتظار$/ }).click();
    await expect(dialog).toBeHidden();
    // «أُضيفت 3 بنود …» (3–10) or «أُضيف …» (the other forms).
    await expect(page.getByText(/^أُضيفت? .* إلى قائمة الانتظار$/)).toBeVisible();

    const backlog = page.getByRole('list', { name: 'بنود قائمة الانتظار' });
    await expect(backlog.getByRole('listitem')).toHaveCount(kept.length);
    for (const title of kept)
      await expect(backlog.getByRole('button', { name: title, exact: true })).toBeVisible();
  });

  const capacity = 8;
  const planned: string[] = [];

  await test.step('plan a sprint with AI within capacity and create it', async () => {
    await page.getByRole('button', { name: 'تخطيط السبرنت' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'تخطيط السبرنت بالذكاء الاصطناعي' });
    await dialog.getByRole('spinbutton', { name: /السعة/ }).fill(String(capacity));
    await dialog.getByRole('button', { name: 'اقترح خطة' }).click();

    await expect(dialog.getByRole('textbox', { name: 'هدف السبرنت المقترح' })).toBeVisible({
      timeout: 45_000,
    });
    const total = dialog.getByText(new RegExp(`^\\d+ / ${capacity} (نقطة|نقاط)$`)).first();
    await expect(total).toBeVisible();
    const points = Number((await total.textContent())?.split(' / ')[0]);
    expect(points, 'planned points').toBeLessThanOrEqual(capacity);
    if (mock) expect(points).toBe(7);

    for (const title of kept) {
      const row = dialog.getByRole('checkbox', { name: new RegExp(escapeRegExp(title)) });
      if (await row.isChecked()) planned.push(title);
    }
    expect(planned.length).toBeGreaterThan(0);

    const create = dialog.getByRole('button', { name: /^إنشاء Sprint 1 / });
    await expect(create).toBeEnabled();
    await create.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(/^Sprint 1 أُنشئ /)).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'بنود Sprint 1' }).getByRole('listitem'),
    ).toHaveCount(planned.length);
  });

  await test.step('start the sprint', async () => {
    await page.getByRole('button', { name: 'بدء السبرنت', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'بدء Sprint 1' });
    await dialog.getByRole('button', { name: 'بدء السبرنت', exact: true }).click();
    await expect(page).toHaveURL(/\/board$/);
    await expect(page.getByRole('heading', { name: 'Sprint 1', level: 2 })).toBeVisible();
    await expect(arColumn(page, AR_STATUS.todo)).toHaveAccessibleName(
      `${AR_STATUS.todo}، ${arTodos(planned.length)}`,
    );
  });

  expect(planned.length, 'todos in the sprint').toBeGreaterThanOrEqual(2);
  const [dragged = '', keyed = ''] = planned;
  const todosBar = page.getByRole('progressbar', { name: 'البنود المنجزة في Sprint 1' });
  const later = [AR_STATUS.in_progress, AR_STATUS.in_review, AR_STATUS.done];

  await test.step('the columns run right to left', async () => {
    const first = await arColumn(page, AR_STATUS.todo).boundingBox();
    const last = await arColumn(page, AR_STATUS.done).boundingBox();
    expect((first?.x ?? 0) > (last?.x ?? 0), 'To Do is drawn to the right of Done').toBe(true);
  });

  await test.step('move a card across every column with a pointer drag', async () => {
    for (const to of later) {
      const moved = nextMove(page);
      await pointerDrag(page, card(page, dragged), arColumn(page, to));
      expect((await moved).ok()).toBe(true);
      await expect(card(arColumn(page, to), dragged)).toBeVisible();
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(todosBar).toHaveAttribute('aria-valuenow', '1');
  });

  await test.step('move another card with the keyboard: ← is the next column in RTL', async () => {
    await card(page, keyed).focus();
    for (const to of later) {
      const moved = nextMove(page);
      await page.keyboard.press('ArrowLeft');
      expect((await moved).ok()).toBe(true);
      await expect(card(arColumn(page, to), keyed)).toBeFocused();
    }
    await expect(todosBar).toHaveAttribute('aria-valuenow', '2');
    // → goes back one column, so it is unfinished when the sprint completes.
    const moved = nextMove(page);
    await page.keyboard.press('ArrowRight');
    expect((await moved).ok()).toBe(true);
    await expect(card(arColumn(page, AR_STATUS.in_review), keyed)).toBeFocused();
    await expect(todosBar).toHaveAttribute('aria-valuenow', '1');
  });

  await test.step('complete the sprint: unfinished to the backlog, with the AI summary', async () => {
    await page.getByRole('button', { name: 'إكمال السبرنت', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'إكمال Sprint 1' });
    await expect(dialog.getByRole('radio', { name: 'قائمة الانتظار', exact: true })).toBeChecked();
    await dialog.getByRole('checkbox', { name: /توليد ملخص بالذكاء الاصطناعي/ }).check();
    await dialog.getByRole('button', { name: 'إكمال السبرنت', exact: true }).click();
    await expect(page).toHaveURL(/\/sprints\/[^/]+$/);
  });

  await test.step('the page of the sprint shows the stats and the summary', async () => {
    const detail = page.getByRole('region', { name: 'Sprint 1', exact: true });
    await expect(detail).toBeVisible();
    const tile = (label: string, value: string) =>
      detail.getByText(new RegExp(`^${label}\\s*${value}$`));
    await expect(tile('البنود المكتملة', arTodos(1))).toBeVisible();
    await expect(tile('المُرحَّل', arTodos(planned.length - 1))).toBeVisible();
    await expect(tile('نسبة الإنجاز', '\\d+%')).toBeVisible();

    const summary = page.getByRole('region', { name: 'ملخص الذكاء الاصطناعي' });
    await expect(summary.getByText(/^وُلّد في /).first()).toBeVisible({ timeout: 45_000 });
    await expect(summary).toContainText('قد يخطئ الذكاء الاصطناعي');
  });

  await test.step('the unfinished todo is back in the backlog', async () => {
    await mainNav(page).getByRole('link', { name: 'قائمة الانتظار', exact: true }).click();
    const backlog = page.getByRole('list', { name: 'بنود قائمة الانتظار' });
    await expect(backlog.getByRole('button', { name: keyed, exact: true })).toBeVisible();
    await expect(backlog.getByRole('button', { name: dragged, exact: true })).toHaveCount(0);
  });
});
