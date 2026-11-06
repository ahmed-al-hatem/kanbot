import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { stripIsolates } from '@/i18n/bidi';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { sentence, switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodoDb, todoHandlers, type TodoDb } from '@/test/todos';

/** Arabic (R3): Todo details — labels, options, validation, unsaved changes, delete, a 404 on save. */

let db: TodoDb;

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
}, 30_000);

beforeEach(async () => {
  db = makeTodoDb();
  useSession.setState({ token: 'test.jwt.token' });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...todoHandlers(db),
    ...projectHandlers(),
  );
  await switchToArabic();
});

const dialog = () => screen.findByRole('dialog', { name: 'KAN-31' }, { timeout: 3000 });
const options = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    // Sprint names are isolated in their option text (i18n/bidi.ts): compare what is read.
    .map((option) => stripIsolates(option.textContent));

describe('Todo details in Arabic', () => {
  it('every label, option and hint reads in Arabic, with axe', async () => {
    renderApp('/projects/p1/backlog?todo=t2');
    const panel = await dialog();
    const details = within(panel);

    expect(await details.findByRole('textbox', { name: /^العنوان/ })).toHaveValue('Login screen');
    expect(details.getByText('مهمة · أُنشئ في 2 تشرين الثاني 2026')).toBeInTheDocument();
    expect(document.title).toBe('KAN-31 · Kanbot App · Kanbot');
    expect(details.getByRole('textbox', { name: 'الوصف' })).toHaveAttribute(
      'placeholder',
      'أضف مزيدًا من التفاصيل…',
    );
    expect(details.getByRole('button', { name: 'حسّن هذا البند' })).toBeInTheDocument();

    const sprint = details.getByRole('combobox', { name: 'السبرنت' });
    expect(options(sprint)).toEqual(['Sprint 3 (نشط)', 'Sprint 4 (مخطط)', 'قائمة الانتظار']);
    const status = details.getByRole('combobox', { name: 'الحالة' });
    expect(status).toBeDisabled();
    expect(status).toHaveAccessibleDescription('انقله إلى السبرنت النشط لتحديد حالته');
    expect(options(status)).toEqual(['للتنفيذ', 'قيد التنفيذ', 'قيد المراجعة', 'منجز']);
    expect(options(details.getByRole('combobox', { name: 'الأولوية' }))).toEqual([
      'عاجلة',
      'عالية',
      'متوسطة',
      'منخفضة',
    ]);
    expect(options(details.getByRole('combobox', { name: 'النوع' }))).toEqual([
      'قصة',
      'مهمة',
      'خلل',
    ]);
    expect(options(details.getByRole('combobox', { name: 'نقاط القصة' }))).toEqual([
      'غير مقدّر',
      '1',
      '2',
      '3',
      '5',
      '8',
      '13',
    ]);
    expect(details.getByRole('button', { name: 'إزالة الوسم auth' })).toBeInTheDocument();
    expect(details.getByText(/لإضافة وسم/)).toHaveTextContent(
      'اضغط Enter أو , لإضافة وسم، وBackspace لإزالة الأخير',
    );
    expect(details.getByLabelText('تاريخ الاستحقاق')).toHaveValue('');
    expect(details.getByText('للإغلاق')).toHaveTextContent('Esc للإغلاق');
    for (const name of ['حذف', 'إلغاء', 'حفظ التغييرات', 'إغلاق']) {
      expect(details.getByRole('button', { name })).toBeInTheDocument();
    }
    await expectNoAxeViolations(panel);
  });

  it('validates the title and asks before discarding, in Arabic', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog?todo=t2');
    const details = within(await dialog());

    const title = await details.findByRole('textbox', { name: /^العنوان/ });
    await user.clear(title);
    await user.tab();
    await waitFor(() => {
      expect(title).toHaveAccessibleDescription('يحتاج البند إلى عنوان');
    });

    await user.keyboard('{Escape}');
    expect(await details.findByText('تجاهل تغييراتك غير المحفوظة؟')).toBeInTheDocument();
    expect(details.getByRole('button', { name: 'متابعة التعديل' })).toHaveFocus();
    expect(details.getByRole('button', { name: 'تجاهل' })).toBeInTheDocument();
    expect(details.getAllByText('تغييرات غير محفوظة').length).toBeGreaterThan(0);
  });

  it('a 404 on save says the todo is gone, in Arabic, and keeps the edits', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(apiUrl('/todos/:todoId'), () =>
        HttpResponse.json(errorBody('NOT_FOUND', 'Todo not found'), { status: 404 }),
      ),
    );
    renderApp('/projects/p1/backlog?todo=t2');
    const details = within(await dialog());

    const title = await details.findByRole('textbox', { name: /^العنوان/ });
    await user.type(title, ' v2');
    await user.click(details.getByRole('button', { name: 'حفظ التغييرات' }));

    expect(
      await details.findByText(
        sentence('تعذّر حفظ KAN-31. لم نعد نجد هذا البند، ربما حُذف. تعديلاتك ما زالت هنا.'),
      ),
    ).toBeInTheDocument();
    expect(details.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
    expect(screen.queryByText(/Todo not found/)).not.toBeInTheDocument();
    expect(title).toHaveValue('Login screen v2');
  });

  it('server validation details go under their fields in Arabic', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(apiUrl('/todos/:todoId'), () =>
        HttpResponse.json(
          errorBody('VALIDATION_ERROR', 'Invalid request body', [
            { path: 'title', message: 'Title is too long' },
          ]),
          { status: 400 },
        ),
      ),
    );
    renderApp('/projects/p1/backlog?todo=t2');
    const details = within(await dialog());

    const title = await details.findByRole('textbox', { name: /^العنوان/ });
    await user.type(title, '!');
    await user.click(details.getByRole('button', { name: 'حفظ التغييرات' }));

    await waitFor(() => {
      expect(title).toHaveAccessibleDescription('أدخل عنوانًا من 200 حرف أو أقل');
    });
    expect(screen.queryByText(/too long/)).not.toBeInTheDocument();
  });

  it('delete confirms in Arabic, then toasts, with axe', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog?todo=t2');
    const details = within(await dialog());

    await user.click(await details.findByRole('button', { name: 'حذف' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'حذف KAN-31؟' });
    expect(confirm).toHaveTextContent(
      'سيُحذف KAN-31 «Login screen» نهائيًا. لا يمكن التراجع عن ذلك.',
    );
    expect(within(confirm).getByRole('button', { name: 'إلغاء' })).toHaveFocus();
    await expectNoAxeViolations(confirm);

    await user.click(within(confirm).getByRole('button', { name: 'حذف البند' }));
    expect(await screen.findByText(sentence('KAN-31 حُذف'))).toBeInTheDocument();
    expect(db.calls.remove).toEqual(['t2']);
  });

  it('a failed delete explains in Arabic, never with the server English', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(apiUrl('/todos/:todoId'), () =>
        HttpResponse.json(errorBody('NOT_FOUND', 'Todo not found'), { status: 404 }),
      ),
    );
    renderApp('/projects/p1/backlog?todo=t2');
    const details = within(await dialog());

    await user.click(await details.findByRole('button', { name: 'حذف' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'حذف KAN-31؟' });
    await user.click(within(confirm).getByRole('button', { name: 'حذف البند' }));

    expect(
      await screen.findByText(sentence('تعذّر حذف KAN-31. لم نعد نجد هذا البند، ربما حُذف.')),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Todo not found/)).not.toBeInTheDocument();
  });
});
