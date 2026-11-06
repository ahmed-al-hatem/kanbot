import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { qk } from '@/hooks/queryKeys';
import { isolate, stripIsolates } from '@/i18n/bidi';
import { ar } from '@/i18n/messages/ar';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { sentence, switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import {
  makeTodo,
  makeTodoDb,
  seedTodos,
  SPRINT_3,
  SPRINT_4,
  todoHandlers,
  type TodoDb,
} from '@/test/todos';

/** Arabic (R3): the backlog page — counts with plurals, groups, rows, filters, quick create, moves, sprints. */

let db: TodoDb;

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
}, 30_000);

function start(todoDb: TodoDb) {
  db = todoDb;
  server.use(...todoHandlers(db), ...projectHandlers());
}

beforeEach(async () => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
  await switchToArabic();
});

const group = (name: string) => screen.getByRole('region', { name });
const live = () => screen.getByTestId('live-polite');
const BACKLOG = 'قائمة الانتظار';

/** `n` backlog todos of one point each, so todos and points take the same plural form. */
function backlogOf(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeTodo({
      id: `b${i + 1}`,
      key: `KAN-${i + 1}`,
      title: `Todo ${i + 1}`,
      storyPoints: 1,
      order: i,
    }),
  );
}

describe('backlog counts in Arabic', () => {
  it.each([
    [1, 'بند واحد · نقطة واحدة'],
    [2, 'بندان · نقطتان'],
    [3, '3 بنود · 3 نقاط'],
    [11, '11 بندًا · 11 نقطة'],
    [100, '100 بند · 100 نقطة'],
  ])('%i todos: the header and the Backlog group read «%s»', async (n, text) => {
    start(makeTodoDb(backlogOf(n), []));
    renderApp('/projects/p1/backlog');

    expect(
      await screen.findByRole('heading', { name: BACKLOG, level: 2 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    // The page header's totals and the Backlog group's meta.
    expect(screen.getAllByText(text)).toHaveLength(2);
  });

  it('0 todos: «لا بنود · لا نقاط» and the empty state, with axe', async () => {
    start(makeTodoDb([], []));
    const { container } = renderApp('/projects/p1/backlog');

    expect(
      await screen.findByRole('heading', { name: 'قائمة الانتظار فارغة' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('لا بنود · لا نقاط')).toHaveLength(2);
    expect(screen.getByText(ar.backlog.empty.text)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'توليد البنود' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'إنشاء بند' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

describe('backlog page in Arabic', () => {
  it('header, groups, rows and the row menu read in Arabic, with axe', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    const { container } = renderApp('/projects/p1/backlog');

    expect(
      await screen.findByRole('heading', { name: 'Sprint 3', level: 2 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: BACKLOG, level: 1 })).toBeInTheDocument();
    expect(document.title).toBe('قائمة الانتظار · Kanbot App · Kanbot');
    expect(screen.getByText('4 بنود · 10 نقاط')).toBeInTheDocument();
    for (const name of ['توليد البنود', 'تخطيط السبرنت', 'إنشاء سبرنت']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    // The page renders more than one Ask AI entry point.
    expect(screen.getAllByRole('button', { name: 'اسأل الذكاء الاصطناعي' }).length).toBeGreaterThan(
      0,
    );

    // Groups: lozenges, dates with Levantine months, counts, actions.
    const active = within(group('Sprint 3'));
    expect(active.getByText('نشط')).toBeInTheDocument();
    expect(
      active.getByText('2 تشرين الثاني – 15 تشرين الثاني · بند واحد · 5 نقاط'),
    ).toBeInTheDocument();
    expect(active.getByRole('button', { name: 'إظهار أو إخفاء Sprint 3' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(active.getByRole('link', { name: 'إكمال السبرنت' })).toBeInTheDocument();
    const planned = within(group('Sprint 4'));
    expect(planned.getByText('مخطط')).toBeInTheDocument();
    expect(
      planned.getByText(sentence('اسحب البنود إلى هنا للتخطيط لـ Sprint 4')),
    ).toBeInTheDocument();
    expect(planned.getByText(sentence('أكمل Sprint 3 أولًا'))).toBeInTheDocument();
    expect(within(group(BACKLOG)).getByText('3 بنود · 5 نقاط')).toBeInTheDocument();

    // A row: type, priority, points and the extra labels, spoken in Arabic.
    const row = within(screen.getByRole('button', { name: 'Login screen' }).closest('li')!);
    expect(row.getByRole('img', { name: 'مهمة' })).toBeInTheDocument();
    expect(row.getByText('متوسطة')).toBeInTheDocument();
    expect(row.getByText('3 نقاط قصة')).toBeInTheDocument();
    expect(row.getByText('+1')).toHaveTextContent('+1 وسوم أخرى: forms');
    expect(row.getByRole('button', { name: 'اسحب KAN-31' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('button', { name: 'Fix crash on save' }).closest('li')!).getByText(
        'عاجلة',
      ),
    ).toBeInTheDocument();

    expect(screen.getByText(/اسحب الصفوف بين المجموعات/)).toHaveTextContent(
      'اسحب الصفوف بين المجموعات، أو حدّد عنوانًا واستخدم ↑ ↓ لنقله.',
    );
    expect(screen.getByRole('button', { name: 'Login screen' })).toHaveAccessibleDescription(
      ar.backlog.rowHelp,
    );
    await expectNoAxeViolations(container);

    await user.click(row.getByRole('button', { name: 'إجراءات KAN-31' }));
    const menu = await screen.findByRole('menu', { name: 'إجراءات KAN-31' });
    const items = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(items).toEqual([
      'فتح التفاصيل',
      'نقل إلى الأعلى',
      'نقل إلى الأسفل',
      'نقل إلى Sprint 3',
      'نقل إلى Sprint 4',
      'حذف',
    ]);
  });

  it('shows the skeleton, then the page error, in Arabic', async () => {
    queryClient.setQueryDefaults(qk.todos('p1'), { retry: false });
    try {
      start(makeTodoDb());
      server.use(
        http.get(apiUrl('/projects/:projectId/todos'), async () => {
          await delay(600);
          return HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), {
            status: 500,
          });
        }),
      );
      renderApp('/projects/p1/backlog');

      expect(await screen.findByText('جارٍ تحميل قائمة الانتظار')).toBeInTheDocument();
      expect(
        await screen.findByRole(
          'heading',
          { name: 'تعذّر تحميل قائمة الانتظار' },
          { timeout: 3000 },
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
      expect(screen.getByText('خطأ 500 · خطأ داخلي في الخادم')).toBeInTheDocument();
    } finally {
      queryClient.setQueryDefaults(qk.todos('p1'), {});
    }
  });

  it('filters: search, selects, "no match" per group, the drag-off reason, with axe', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    const { container } = renderApp('/projects/p1/backlog');

    const search = await screen.findByRole(
      'searchbox',
      { name: 'ابحث في البنود' },
      { timeout: 3000 },
    );
    expect(search).toHaveAttribute('placeholder', 'ابحث في البنود أو المفاتيح');
    expect(screen.getByRole('search', { name: 'تصفية البنود' })).toBeInTheDocument();
    const priority = screen.getByRole('combobox', { name: 'تصفية حسب الأولوية' });
    expect(
      within(priority)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['كل الأولويات', 'عاجلة', 'عالية', 'متوسطة', 'منخفضة']);
    const type = screen.getByRole('combobox', { name: 'تصفية حسب النوع' });
    expect(
      within(type)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['كل الأنواع', 'قصة', 'مهمة', 'خلل']);

    await user.type(search, 'zzz');
    expect(await screen.findByText('عرض 0 من 4', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(
      within(group('Sprint 3')).getByText(sentence('لا توجد بنود في Sprint 3 تطابق عوامل التصفية')),
    ).toBeInTheDocument();
    expect(
      within(group('Sprint 4')).getByText(sentence('لا توجد بنود في Sprint 4 بعد')),
    ).toBeInTheDocument();
    expect(
      within(group(BACKLOG)).getByText(
        sentence('لا توجد بنود في قائمة الانتظار تطابق عوامل التصفية'),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(ar.backlog.dragOff)).toBeInTheDocument();
    await expectNoAxeViolations(container);

    await user.click(screen.getByRole('button', { name: 'مسح عوامل التصفية' }));
    expect(await screen.findByRole('button', { name: 'Login screen' })).toBeInTheDocument();
    expect(screen.queryByText(/عرض \d+ من/)).not.toBeInTheDocument();
  });
});

describe('quick create in Arabic', () => {
  it('a blank title sends nothing; a rejected title explains in Arabic, never the server English', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    server.use(
      http.post(apiUrl('/projects/:projectId/todos'), () =>
        HttpResponse.json(
          errorBody('VALIDATION_ERROR', 'Invalid request body', [
            { path: 'title', message: 'Title is required' },
          ]),
          { status: 400 },
        ),
      ),
    );
    renderApp('/projects/p1/backlog');

    const input = await screen.findByRole('textbox', { name: 'إنشاء بند' }, { timeout: 3000 });
    expect(input).toHaveAttribute('placeholder', 'إنشاء بند — اكتب عنوانًا واضغط Enter');
    await user.click(input);
    await user.type(input, '   {Enter}');
    expect(db.calls.create).toEqual([]);

    await user.clear(input);
    await user.type(input, 'Bad title');
    expect(screen.getByText('للإضافة')).toHaveTextContent('Enter للإضافة');
    await user.keyboard('{Enter}');

    expect(
      await screen.findByText(
        sentence('تعذّر إنشاء «Bad title». بعض القيم غير صالحة. تحقق من الحقول وحاول مجددًا.'),
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Invalid request body|Title is required/)).not.toBeInTheDocument();
    expect(input).toHaveValue('Bad title');
  });

  it('announces the new key in Arabic', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');

    const input = await screen.findByRole('textbox', { name: 'إنشاء بند' }, { timeout: 3000 });
    await user.click(input);
    await user.type(input, 'New todo{Enter}');
    await waitFor(() => {
      expect(live()).toHaveTextContent('KAN-40 أُنشئ');
    });
  });
});

describe('moves and drag and drop in Arabic', () => {
  it('dnd-kit reads the keyboard instructions in Arabic; ↓ announces the place, the menu offers Undo', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');

    const title = await screen.findByRole('button', { name: 'Login screen' }, { timeout: 3000 });
    // dnd-kit's hidden description of every drag handle.
    expect(screen.getByText(ar.backlog.dragInstructions)).toBeInTheDocument();

    title.focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(live()).toHaveTextContent('KAN-31 نُقل إلى قائمة الانتظار، الموضع 2 من 3');
    });

    await user.click(within(title.closest('li')!).getByRole('button', { name: 'إجراءات KAN-31' }));
    await user.click(await screen.findByRole('menuitem', { name: 'نقل إلى Sprint 4' }));
    expect(await screen.findByText(sentence('KAN-31 نُقل إلى Sprint 4'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'تراجع' }));
    expect(
      await screen.findByText(sentence('KAN-31 أُعيد إلى قائمة الانتظار')),
    ).toBeInTheDocument();
  });

  it('a failed move explains in Arabic', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    server.use(
      http.post(apiUrl('/todos/:todoId/move'), () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong on our side.'), {
          status: 500,
        }),
      ),
    );
    renderApp('/projects/p1/backlog');

    (await screen.findByRole('button', { name: 'Login screen' }, { timeout: 3000 })).focus();
    await user.keyboard('{ArrowDown}');
    expect(
      await screen.findByText(sentence('تعذّر نقل KAN-31. حدث خطأ من جهتنا. حاول مجددًا.')),
    ).toBeInTheDocument();
    expect(screen.queryByText(/on our side/)).not.toBeInTheDocument();
  });
});

describe('sprint actions in Arabic', () => {
  it('Start is blocked while another sprint is active, with a way to the board', async () => {
    const user = userEvent.setup();
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');

    const planned = await screen.findByRole('region', { name: 'Sprint 4' }, { timeout: 3000 });
    await user.click(within(planned).getByRole('button', { name: 'بدء السبرنت' }));
    expect(
      await screen.findByText(sentence('أكمل Sprint 3 قبل بدء Sprint 4.')),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الذهاب إلى اللوحة' })).toBeInTheDocument();
  });

  it('delete sprint: the confirm counts its todos with plurals, then the toast, with axe', async () => {
    const user = userEvent.setup();
    const todos = seedTodos();
    todos[3]!.sprintId = 's4';
    start(makeTodoDb(todos, [SPRINT_3, SPRINT_4]));
    renderApp('/projects/p1/backlog');

    await user.click(
      await screen.findByRole('button', { name: 'إجراءات Sprint 4' }, { timeout: 3000 }),
    );
    const menu = await screen.findByRole('menu', { name: 'إجراءات Sprint 4' });
    expect(within(menu).getByRole('menuitem', { name: 'تعديل السبرنت' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: 'حذف السبرنت' }));

    const confirm = await screen.findByRole('alertdialog', { name: 'حذف Sprint 4؟' });
    expect(confirm).toHaveTextContent('سيعود بنده الوحيد إلى قائمة الانتظار؛ لا يُحذف أي بند.');
    await expectNoAxeViolations(confirm);
    await user.click(within(confirm).getByRole('button', { name: 'حذف السبرنت' }));

    expect(
      await screen.findByText(sentence('Sprint 4 حُذف · نُقل بند واحد إلى قائمة الانتظار')),
    ).toBeInTheDocument();
    expect(db.calls.deleteSprint).toEqual(['s4']);
  });
});

describe('delete sprint confirm plurals', () => {
  it.each([
    [1, 'سيعود بنده الوحيد إلى قائمة الانتظار؛ لا يُحذف أي بند.'],
    [2, 'سيعود بنداه إلى قائمة الانتظار؛ لا يُحذف أي بند.'],
    [3, 'ستعود بنوده الـ3 إلى قائمة الانتظار؛ لا يُحذف أي بند.'],
    [11, 'ستعود بنوده الـ11 إلى قائمة الانتظار؛ لا يُحذف أي بند.'],
  ])('%i todos', (n, text) => {
    expect(ar.backlog.deleteSprint.withTodos(n)).toBe(text);
  });

  it.each([
    [1, 'Sprint 4 حُذف · نُقل بند واحد إلى قائمة الانتظار'],
    [2, 'Sprint 4 حُذف · نُقل بندان إلى قائمة الانتظار'],
    [3, 'Sprint 4 حُذف · نُقلت 3 بنود إلى قائمة الانتظار'],
    [11, 'Sprint 4 حُذف · نُقل 11 بندًا إلى قائمة الانتظار'],
    [100, 'Sprint 4 حُذف · نُقل 100 بند إلى قائمة الانتظار'],
  ])('toast with %i todos', (n, text) => {
    const toast = ar.backlog.toast.sprintDeleted('Sprint 4', n);
    // The sprint's name is isolated (i18n/bidi.ts), so «Sprint 4» keeps its order in Arabic.
    expect(toast.startsWith(isolate('Sprint 4'))).toBe(true);
    expect(stripIsolates(toast)).toBe(text);
  });
});
