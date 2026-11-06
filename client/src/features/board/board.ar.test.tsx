import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ar } from '@/i18n/messages/ar';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { sentence, switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodo, makeTodoDb, SPRINT_3, SPRINT_4, todoHandlers, type TodoDb } from '@/test/todos';

/** Arabic (R4): the Active Sprint board and Complete sprint. Sprint names and todo titles are data. */

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

const column = (name: string) => screen.getByRole('region', { name });
const live = () => screen.getByTestId('live-polite');
const TODO = 'للتنفيذ';
const IN_PROGRESS = 'قيد التنفيذ';

/** `n` To Do cards of one point each in the active sprint, so the counts and points share a form. */
function sprintOf(n: number) {
  return makeTodoDb(
    Array.from({ length: n }, (_, i) =>
      makeTodo({
        id: `c${i + 1}`,
        key: `KAN-${i + 1}`,
        title: `Card ${i + 1}`,
        sprintId: 's3',
        storyPoints: 1,
        order: i,
      }),
    ),
    [SPRINT_3, SPRINT_4],
  );
}

/** Two To Do cards (3 + 2 points), one in progress, one done (3 points), Sprint 4 planned from Nov 16. */
function boardDb() {
  return makeTodoDb(
    [
      makeTodo({
        id: 'a1',
        key: 'KAN-21',
        title: 'Validate signup form',
        sprintId: 's3',
        storyPoints: 3,
        order: 0,
      }),
      makeTodo({
        id: 'a2',
        key: 'KAN-22',
        title: 'Board filters',
        sprintId: 's3',
        storyPoints: 2,
        order: 1,
      }),
      makeTodo({
        id: 'a3',
        key: 'KAN-18',
        title: 'Drag cards between columns',
        sprintId: 's3',
        status: 'in_progress',
        type: 'story',
        priority: 'high',
        labels: ['frontend', 'dnd', 'a11y'],
        dueDate: '2020-01-01',
      }),
      makeTodo({
        id: 'a5',
        key: 'KAN-15',
        title: 'Set up routing',
        sprintId: 's3',
        status: 'done',
        storyPoints: 3,
      }),
    ],
    [
      { ...SPRINT_3, goal: 'Users can sign up' },
      { ...SPRINT_4, startDate: '2026-11-16' },
    ],
  );
}

describe('board counts in Arabic (plural forms)', () => {
  it.each([
    [0, 'لا بنود', 'لا نقاط', '0 من 0 نقطة منجزة'],
    [1, 'بند واحد', 'نقطة واحدة', '0 من 1 نقطة منجزة'],
    [2, 'بندان', 'نقطتان', '0 من 2 نقطة منجزة'],
    [3, '3 بنود', '3 نقاط', '0 من 3 نقاط منجزة'],
    [11, '11 بندًا', '11 نقطة', '0 من 11 نقطة منجزة'],
    [100, '100 بند', '100 نقطة', '0 من 100 نقطة منجزة'],
  ])(
    '%i cards: the column reads «%s · %s», the points bar «%s»',
    async (n, todos, points, progress) => {
      start(sprintOf(n));
      renderApp('/projects/p1/board');

      expect(
        await screen.findByRole('heading', { name: 'Sprint 3', level: 2 }, { timeout: 3000 }),
      ).toBeInTheDocument();
      const todo = column(`${TODO}، ${todos}`);
      expect(within(todo).getByRole('heading', { name: TODO, level: 3 })).toBeInTheDocument();
      expect(within(todo).getByText(points)).toBeInTheDocument();
      expect(
        screen.getByRole('progressbar', { name: 'النقاط المنجزة في Sprint 3' }),
      ).toHaveAttribute('aria-valuetext', progress);
      // The other columns are empty: «لا بنود», «لا نقاط» and the drop hint.
      const empty = within(column(`${IN_PROGRESS}، لا بنود`));
      expect(empty.getByText('لا نقاط')).toBeInTheDocument();
      expect(empty.getByText('أفلت البنود هنا')).toBeInTheDocument();
    },
  );
});

describe('board page in Arabic', () => {
  it('header, columns, cards and menus read in Arabic, with axe and the page title', async () => {
    const user = userEvent.setup();
    start(boardDb());
    const { container } = renderApp('/projects/p1/board');

    expect(
      await screen.findByRole('heading', { name: 'Sprint 3', level: 2 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'السبرنت النشط', level: 1 })).toBeInTheDocument();
    expect(document.title).toBe('السبرنت النشط · Kanbot App · Kanbot');
    expect(screen.getByText('نشط')).toBeInTheDocument();
    expect(screen.getByText('2 تشرين الثاني – 15 تشرين الثاني')).toBeInTheDocument();
    expect(screen.getByText('الهدف:').parentElement).toHaveTextContent('الهدف: Users can sign up');
    expect(screen.getByRole('progressbar', { name: 'النقاط المنجزة في Sprint 3' })).toHaveAttribute(
      'aria-valuetext',
      '3 من 8 نقاط منجزة',
    );
    expect(screen.getByRole('progressbar', { name: 'البنود المنجزة في Sprint 3' })).toHaveAttribute(
      'aria-valuetext',
      '1 من 4 بنود منجزة',
    );
    expect(screen.getByText('3 / 8').parentElement).toHaveTextContent('3 / 8 نقاط منجزة');
    expect(screen.getByRole('button', { name: 'تلخيص' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إكمال السبرنت' })).toBeInTheDocument();
    // The key caps stay Latin inside the Arabic sentence.
    expect(screen.getByText(/اسحب البطاقات بين الأعمدة/)).toHaveTextContent(
      'اسحب البطاقات بين الأعمدة، أو حدّد بطاقة واستخدم ← → ↑ ↓ لنقلها.',
    );

    // Column names are the todo statuses.
    expect(column(`${TODO}، بندان`)).toBeInTheDocument();
    expect(column(`${IN_PROGRESS}، بند واحد`)).toBeInTheDocument();
    expect(column('قيد المراجعة، لا بنود')).toBeInTheDocument();
    expect(column('منجز، بند واحد')).toBeInTheDocument();
    expect(within(column(`${TODO}، بندان`)).getByText('5 نقاط')).toBeInTheDocument();

    // A card: type, priority, overdue, extra labels and points, spoken in Arabic.
    const card = screen.getByRole('button', { name: /^Drag cards between columns/ });
    expect(card).toHaveTextContent('قصة');
    expect(card).toHaveTextContent('عالية');
    expect(card).toHaveTextContent('متأخر، الاستحقاق 1 كانون الثاني');
    expect(card).toHaveTextContent('+1 وسوم أخرى: a11y');
    expect(card).toHaveTextContent('غير مقدّر');
    expect(
      within(screen.getByRole('button', { name: /^Set up routing/ })).getByRole('img', {
        name: 'منجز',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إنشاء بند في للتنفيذ' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'إجراءات KAN-21' }));
    const menu = await screen.findByRole('menu', { name: 'إجراءات KAN-21' });
    expect(within(menu).getByRole('menuitem', { name: 'فتح التفاصيل' })).toBeInTheDocument();
    for (const name of ['نقل إلى قيد التنفيذ', 'نقل إلى قيد المراجعة', 'نقل إلى منجز']) {
      expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument();
    }
    await user.keyboard('{Escape}');

    await expectNoAxeViolations(container);
  });

  it('a keyboard move announces the place and toasts with Undo, in Arabic', async () => {
    const user = userEvent.setup();
    start(boardDb());
    renderApp('/projects/p1/board');

    const button = await screen.findByRole('button', { name: /^Board filters/ }, { timeout: 3000 });
    button.focus();
    // RTL: the columns run right to left, so ← moves to the next column (the one drawn on the left).
    await user.keyboard('{ArrowLeft}');

    await waitFor(() => {
      expect(live()).toHaveTextContent('KAN-22 نُقل إلى قيد التنفيذ، الموضع 2 من 2');
    });
    expect(await screen.findByText(sentence('KAN-22 نُقل إلى قيد التنفيذ'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'تراجع' }));
    expect(await screen.findByText(sentence('KAN-22 أُعيد إلى للتنفيذ'))).toBeInTheDocument();

    // At the edge: → from the first column (the rightmost) stays, with the column's own name.
    (await screen.findByRole('button', { name: /^Validate signup form/ })).focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(live()).toHaveTextContent('KAN-21 في للتنفيذ بالفعل');
    });
  });

  it('the composer reads in Arabic and announces the new card', async () => {
    const user = userEvent.setup();
    start(boardDb());
    renderApp('/projects/p1/board');

    await user.click(
      await screen.findByRole('button', { name: 'إنشاء بند في قيد التنفيذ' }, { timeout: 3000 }),
    );
    const input = screen.getByRole('textbox', { name: 'بند جديد في قيد التنفيذ' });
    expect(input).toHaveAttribute('placeholder', 'ما الذي يجب إنجازه؟');
    expect(screen.getByRole('button', { name: 'إضافة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
    await user.type(input, 'Write the docs{Enter}');
    expect(await screen.findByRole('button', { name: /^Write the docs/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(live()).toHaveTextContent(/أُنشئ في قيد التنفيذ$/);
    });
  });

  it('no active sprint: the empty state and Start, in Arabic', async () => {
    db = makeTodoDb(
      [
        makeTodo({
          id: 'q1',
          key: 'PORT-1',
          title: 'Planned work',
          projectId: 'p2',
          sprintId: 's4',
          storyPoints: 2,
        }),
      ],
      [{ ...SPRINT_4, projectId: 'p2' }],
    );
    server.use(...todoHandlers(db), ...projectHandlers());
    const { container } = renderApp('/projects/p2/board');

    expect(
      await screen.findByRole('heading', { name: 'لا يوجد سبرنت نشط' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(ar.board.noActive.text)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الذهاب إلى قائمة الانتظار' })).toHaveAttribute(
      'href',
      '/projects/p2/backlog',
    );
    expect(await screen.findByRole('button', { name: 'بدء Sprint 4' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إكمال السبرنت' })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

describe('complete sprint in Arabic', () => {
  it('counts, choices and confirm read in Arabic; the toast names where the todos went', async () => {
    const user = userEvent.setup();
    start(boardDb());
    renderApp('/projects/p1/board');

    await user.click(
      await screen.findByRole('button', { name: 'إكمال السبرنت' }, { timeout: 3000 }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'إكمال Sprint 3' });
    expect(dialog).toHaveAccessibleDescription('منجز: بند واحد · غير منجز: 3 بنود');
    expect(within(dialog).getByText('اكتمل 3 من 8 نقاط قصة.')).toBeInTheDocument();
    expect(within(dialog).getByText('انقل 3 بنود غير منجزة إلى')).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'قائمة الانتظار' })).toBeChecked();
    expect(within(dialog).getByText('· مخطط، يبدأ 16 تشرين الثاني')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('checkbox', { name: /توليد ملخص بالذكاء الاصطناعي/ }),
    ).not.toBeChecked();
    expect(within(dialog).getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
    await expectNoAxeViolations(dialog);

    await user.click(within(dialog).getByRole('button', { name: 'إكمال السبرنت' }));

    expect(
      await screen.findByText(sentence('Sprint 3 اكتمل · نُقلت 3 بنود إلى قائمة الانتظار')),
    ).toBeInTheDocument();
    expect(db.calls.completeSprint).toEqual([
      { sprintId: 's3', body: { moveUnfinishedTo: 'backlog' } },
    ]);
    // The sprint's page in the history, titled in Arabic.
    expect(await screen.findByRole('heading', { name: 'السبرنتات', level: 1 })).toBeInTheDocument();
    expect(document.title).toBe('Sprint 3 · السبرنتات · Kanbot App · Kanbot');
  });

  it('a planned destination and two todos: «نُقل بندان إلى Sprint 4»', async () => {
    const user = userEvent.setup();
    const todoDb = boardDb();
    // Leave two unfinished todos.
    todoDb.todos = todoDb.todos.filter((todo) => todo.id !== 'a3');
    start(todoDb);
    renderApp('/projects/p1/board');

    await user.click(
      await screen.findByRole('button', { name: 'إكمال السبرنت' }, { timeout: 3000 }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'إكمال Sprint 3' });
    expect(within(dialog).getByText('انقل البندين غير المنجزين إلى')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('radio', { name: /Sprint 4/ }));
    await user.click(within(dialog).getByRole('button', { name: 'إكمال السبرنت' }));

    expect(
      await screen.findByText(sentence('Sprint 3 اكتمل · نُقل بندان إلى Sprint 4')),
    ).toBeInTheDocument();
  });

  it('a failure stays in the dialog in Arabic, never the server English', async () => {
    const user = userEvent.setup();
    start(boardDb());
    server.use(
      http.post(apiUrl('/sprints/:sprintId/complete'), () =>
        HttpResponse.json(errorBody('CONFLICT', 'Only the active sprint can be completed.'), {
          status: 409,
        }),
      ),
    );
    renderApp('/projects/p1/board');

    await user.click(
      await screen.findByRole('button', { name: 'إكمال السبرنت' }, { timeout: 3000 }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'إكمال Sprint 3' });
    await user.click(within(dialog).getByRole('button', { name: 'إكمال السبرنت' }));

    expect(await within(dialog).findByText(ar.errors.server.CONFLICT(''))).toBeInTheDocument();
    expect(
      within(dialog).queryByText('Only the active sprint can be completed.'),
    ).not.toBeInTheDocument();
  });
});
