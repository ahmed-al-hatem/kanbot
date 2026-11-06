import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setLocale } from '@/i18n';
import { addDays, todayIso } from '@/lib/dates';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { sentence, switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodoDb, seedTodos, SPRINT_4, todoHandlers, type TodoDb } from '@/test/todos';

/** Arabic (R3): Create / edit sprint and Start sprint — labels, the length hint, date validation, a 409. */

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

async function openCreate() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'إنشاء سبرنت' }, { timeout: 3000 }));
  return { user, dialog: await screen.findByRole('dialog', { name: 'إنشاء سبرنت' }) };
}

describe('create sprint in Arabic', () => {
  it('labels, the length hint and date validation read in Arabic, with axe', async () => {
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');
    const { user, dialog } = await openCreate();
    const form = within(dialog);

    expect(form.getByRole('textbox', { name: /^اسم السبرنت/ })).toHaveValue('Sprint 5');
    const startDate = form.getByLabelText('تاريخ البدء');
    const endDate = form.getByLabelText('تاريخ الانتهاء');
    // Sprint 3 ends on Nov 15: the new one starts the next day and lasts two weeks.
    expect(endDate).toHaveAccessibleDescription('أسبوعان · 16 تشرين الثاني – 30 تشرين الثاني');
    expect(form.getByRole('textbox', { name: 'هدف السبرنت' })).toHaveAccessibleDescription(
      'اختياري · حتى 300 حرف',
    );
    expect(form.getByRole('textbox', { name: 'هدف السبرنت' })).toHaveAttribute(
      'placeholder',
      'ماذا يجب أن يُسلّم هذا السبرنت؟',
    );
    await expectNoAxeViolations(dialog);

    fireEvent.change(startDate, { target: { value: '2026-12-01' } });
    expect(endDate).toHaveValue('2026-12-15');
    fireEvent.change(endDate, { target: { value: '2026-12-11' } });
    expect(endDate).toHaveAccessibleDescription('10 أيام · 1 كانون الأول – 11 كانون الأول');

    fireEvent.change(endDate, { target: { value: '2026-11-20' } });
    fireEvent.blur(endDate);
    expect(await form.findByText('يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء')).toBeInTheDocument();
    expect(endDate).toHaveAttribute('aria-invalid', 'true');

    await user.clear(form.getByRole('textbox', { name: /^اسم السبرنت/ }));
    await user.click(form.getByRole('button', { name: 'إنشاء سبرنت' }));
    expect(await form.findByText('امنح السبرنت اسمًا')).toBeInTheDocument();
    expect(db.calls.createSprint).toEqual([]);
    await expectNoAxeViolations(dialog);
  });

  it('creates the sprint with an Arabic toast', async () => {
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');
    const { user, dialog } = await openCreate();

    await user.click(within(dialog).getByRole('button', { name: 'إنشاء سبرنت' }));
    expect(
      await screen.findByText(sentence('Sprint 5 أُنشئ · اسحب البنود إليه')),
    ).toBeInTheDocument();
  });

  it('a server date error goes under End date in Arabic, never the server English', async () => {
    start(makeTodoDb());
    server.use(
      http.post(apiUrl('/projects/:projectId/sprints'), () =>
        HttpResponse.json(
          errorBody('VALIDATION_ERROR', 'End date must be on or after the start date', [
            { path: 'endDate', message: 'End date must be on or after the start date' },
          ]),
          { status: 400 },
        ),
      ),
    );
    renderApp('/projects/p1/backlog');
    const { user, dialog } = await openCreate();

    await user.click(within(dialog).getByRole('button', { name: 'إنشاء سبرنت' }));
    const endDate = within(dialog).getByLabelText('تاريخ الانتهاء');
    await waitFor(() => {
      expect(endDate).toHaveAccessibleDescription(
        'يجب أن يكون تاريخ الانتهاء في يوم البدء أو بعده',
      );
    });
    expect(screen.queryByText(/on or after/)).not.toBeInTheDocument();
  });
});

describe('a visible sprint form error follows a language switch', () => {
  it('re-reads the date error in English and back, keeping the values', async () => {
    start(makeTodoDb());
    renderApp('/projects/p1/backlog');
    const { dialog } = await openCreate();
    const form = within(dialog);

    const endDate = form.getByLabelText('تاريخ الانتهاء');
    fireEvent.change(endDate, { target: { value: '2026-11-10' } });
    fireEvent.blur(endDate);
    expect(await form.findByText('يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء')).toBeInTheDocument();

    await act(() => setLocale('en'));
    expect(await screen.findByRole('dialog', { name: 'Create sprint' })).toBe(dialog);
    expect(await form.findByText('End date must be after start date')).toBeInTheDocument();
    expect(form.queryByText('يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء')).not.toBeInTheDocument();
    expect(form.getByLabelText('End date')).toHaveValue('2026-11-10');

    await act(() => setLocale('ar'));
    expect(await form.findByText('يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء')).toBeInTheDocument();
    expect(form.queryByText('End date must be after start date')).not.toBeInTheDocument();
  });
});

describe('start sprint in Arabic', () => {
  /** Sprint 4 planned with one todo, and no active sprint on the client. */
  function plannedOnly() {
    const todos = seedTodos().filter((todo) => todo.sprintId === null);
    todos[0]!.sprintId = 's4';
    start(makeTodoDb(todos, [SPRINT_4]));
  }

  it('the dialog reads in Arabic, with axe', async () => {
    const user = userEvent.setup();
    plannedOnly();
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'بدء السبرنت' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'بدء Sprint 4' });
    const today = todayIso();
    expect(within(dialog).getByLabelText(/تاريخ البدء/)).toHaveValue(today);
    expect(within(dialog).getByLabelText(/تاريخ الانتهاء/)).toHaveValue(addDays(today, 14));
    expect(dialog).toHaveTextContent('بند واحد · 3 نقاط');
    expect(dialog).toHaveTextContent('تنتقل بنوده إلى لوحة السبرنت النشط، حيث تتابعها حتى تكمله.');
    expect(within(dialog).getByRole('button', { name: 'إلغاء' })).toBeInTheDocument();
    await expectNoAxeViolations(dialog);

    await user.click(within(dialog).getByRole('button', { name: 'بدء السبرنت' }));
    expect(await screen.findByText(sentence('Sprint 4 بدأ'))).toBeInTheDocument();
  });

  it('a 409 (a sprint is already active) explains in Arabic, never the server English', async () => {
    const user = userEvent.setup();
    plannedOnly();
    // Started in another tab: the client still sees no active sprint.
    server.use(
      http.post(apiUrl('/sprints/:sprintId/start'), () =>
        HttpResponse.json(
          errorBody(
            'CONFLICT',
            '"Sprint 3" is still active. Complete it before starting another sprint.',
          ),
          { status: 409 },
        ),
      ),
    );
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'بدء السبرنت' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'بدء Sprint 4' });
    await user.click(within(dialog).getByRole('button', { name: 'بدء السبرنت' }));

    expect(
      await within(dialog).findByText('يوجد سبرنت نشط بالفعل. أكمله قبل بدء سبرنت آخر.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/still active/)).not.toBeInTheDocument();
    expect(db.calls.startSprint).toEqual([]);
  });

  it('missing dates are required in Arabic', async () => {
    const user = userEvent.setup();
    plannedOnly();
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'بدء السبرنت' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'بدء Sprint 4' });
    fireEvent.change(within(dialog).getByLabelText(/تاريخ البدء/), { target: { value: '' } });
    fireEvent.change(within(dialog).getByLabelText(/تاريخ الانتهاء/), { target: { value: '' } });
    await user.click(within(dialog).getByRole('button', { name: 'بدء السبرنت' }));

    expect(await within(dialog).findByText('اختر تاريخ البدء')).toBeInTheDocument();
    expect(within(dialog).getByText('اختر تاريخ الانتهاء')).toBeInTheDocument();
  });
});
