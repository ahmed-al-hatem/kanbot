import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { queryClient } from '@/app/queryClient';
import { qk } from '@/hooks/queryKeys';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { sentence, switchToArabic } from '@/test/locale';
import { KANBOT, makeProject, PORTFOLIO, projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import type { ProjectWithStats } from '@/types/api';

/** Arabic (R2): the projects page, its plurals, empty state, dialog and delete confirm. */

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
}, 30_000);

beforeEach(async () => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
  await switchToArabic();
});

/** `n` projects; the first one has `n` backlog todos, so its tile shows the same plural form. */
function projectsOf(n: number): ProjectWithStats[] {
  return Array.from({ length: n }, (_, i) =>
    makeProject({
      id: `p${i + 1}`,
      name: `Project ${i + 1}`,
      key: `P${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}`,
      stats: { backlogCount: i === 0 ? n : 0, totalTodos: 0, activeSprint: null },
    }),
  );
}

describe('projects page in Arabic', () => {
  it.each([
    [1, 'مشروع واحد', 'بند واحد في قائمة الانتظار'],
    [2, 'مشروعان', 'بندان في قائمة الانتظار'],
    [3, '3 مشاريع', '3 بنود في قائمة الانتظار'],
    [11, '11 مشروعًا', '11 بندًا في قائمة الانتظار'],
    [100, '100 مشروع', '100 بند في قائمة الانتظار'],
  ])('%i projects: the header reads «%s», the first tile «%s»', async (n, header, backlog) => {
    server.use(...projectHandlers(projectsOf(n)));
    renderApp('/projects');

    expect(await screen.findByRole('heading', { name: 'المشاريع', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(header)).toBeInTheDocument();
    // The skeleton stays at least 300 ms (useDelayedLoading), even once the count is in the header.
    const first = (await screen.findByRole('heading', { name: 'Project 1' })).closest('article')!;
    expect(within(first).getByText(backlog)).toBeInTheDocument();
    expect(within(first).getByText('لا يوجد سبرنت نشط')).toBeInTheDocument();
    expect(document.title).toBe('المشاريع · Kanbot');
  });

  it('0 projects: «لا مشاريع» and the empty state, with axe', async () => {
    server.use(...projectHandlers([]));
    const { container } = renderApp('/projects');

    expect(await screen.findByRole('heading', { name: 'لا توجد مشاريع بعد' })).toBeInTheDocument();
    expect(screen.getByText('لا مشاريع')).toBeInTheDocument();
    expect(screen.getByText('أنشئ مشروعك الأول لتبدأ التخطيط للسبرنتات.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أنشئ مشروعك الأول' })).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it('tiles, search and no-match read in Arabic, with axe', async () => {
    const user = userEvent.setup();
    server.use(...projectHandlers([KANBOT, PORTFOLIO]));
    const { container } = renderApp('/projects');

    const kanbot = (await screen.findByRole('heading', { name: 'Kanbot App' })).closest('article')!;
    expect(within(kanbot).getByText(sentence('Sprint 3 نشط'))).toBeInTheDocument();
    expect(within(kanbot).getByText('12 بندًا في قائمة الانتظار')).toBeInTheDocument();
    expect(within(kanbot).getByRole('button', { name: 'إجراءات Kanbot App' })).toBeInTheDocument();
    await expectNoAxeViolations(container);

    const search = screen.getByRole('searchbox', { name: 'ابحث في المشاريع' });
    expect(search).toHaveAttribute('placeholder', 'ابحث بالاسم أو المفتاح');
    await user.type(search, 'zzz');
    expect(
      await screen.findByRole('heading', { name: 'لا توجد مشاريع تطابق «zzz»' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'مسح البحث' }));
    expect(await screen.findByRole('heading', { name: 'Kanbot App' })).toBeInTheDocument();
  });

  it('the create dialog: labels, key preview, validation and a 409 under Key', async () => {
    const user = userEvent.setup();
    server.use(
      ...projectHandlers([KANBOT, PORTFOLIO]),
      http.post(apiUrl('/projects'), () =>
        HttpResponse.json(
          errorBody('CONFLICT', 'You already have a project with the key "MOB".', [
            { path: 'key', message: 'This key is already used by another project' },
          ]),
          { status: 409 },
        ),
      ),
    );
    renderApp('/projects');

    await user.click((await screen.findAllByRole('button', { name: 'مشروع جديد' }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'إنشاء مشروع' });
    expect(within(dialog).getByRole('button', { name: 'إغلاق' })).toBeInTheDocument();
    expect(within(dialog).getByText('مشروع بلا عنوان')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'إنشاء مشروع' }));
    expect(await within(dialog).findByText('امنح مشروعك اسمًا')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/اسم المشروع/), 'Mobile Banking');
    expect(within(dialog).getByText(sentence('ستُرقَّم البنود MB-1'))).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/المفتاح/), 'mob');
    await user.click(within(dialog).getByRole('button', { name: 'إنشاء مشروع' }));

    const key = within(dialog).getByLabelText(/المفتاح/);
    await waitFor(() => {
      expect(key).toHaveAccessibleDescription('هذا المفتاح مستخدم لمشروع آخر');
    });
    expect(key).toHaveFocus();
    await expectNoAxeViolations(dialog);
  });

  it('the delete confirm names the project and its todos in Arabic, with axe', async () => {
    const user = userEvent.setup();
    const db = [KANBOT, PORTFOLIO];
    server.use(
      ...projectHandlers(db),
      http.delete(apiUrl('/projects/p1'), () => {
        db.splice(db.indexOf(KANBOT), 1);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderApp('/projects');

    await user.click(await screen.findByRole('button', { name: 'إجراءات Kanbot App' }));
    await user.click(await screen.findByRole('menuitem', { name: 'حذف' }));

    const confirm = await screen.findByRole('alertdialog', { name: 'حذف Kanbot App؟' });
    expect(confirm).toHaveTextContent(
      'سيُحذف Kanbot App (KAN) نهائيًا مع كل سبرنتاته و24 بندًا. لا يمكن التراجع عن ذلك.',
    );
    expect(within(confirm).getByRole('button', { name: 'إلغاء' })).toHaveFocus();
    await expectNoAxeViolations(confirm);

    await user.click(within(confirm).getByRole('button', { name: 'حذف المشروع' }));
    expect(await screen.findByText(sentence('Kanbot App حُذف'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إغلاق الإشعار' })).toBeInTheDocument();
  });

  it('a failed delete explains in Arabic, never with the server English', async () => {
    const user = userEvent.setup();
    server.use(
      ...projectHandlers([KANBOT, PORTFOLIO]),
      http.delete(apiUrl('/projects/p1'), () =>
        HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong on our side.'), {
          status: 500,
        }),
      ),
    );
    renderApp('/projects');

    await user.click(await screen.findByRole('button', { name: 'إجراءات Kanbot App' }));
    await user.click(await screen.findByRole('menuitem', { name: 'حذف' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'حذف المشروع' }),
    );

    expect(
      await screen.findByText(sentence('تعذّر حذف Kanbot App. حدث خطأ من جهتنا. حاول مجددًا.')),
    ).toBeInTheDocument();
    expect(screen.queryByText(/on our side/)).not.toBeInTheDocument();
  });

  it('a page error reads in Arabic', async () => {
    // The app retries 5xx twice with backoff; skip that here.
    queryClient.setQueryDefaults(qk.projects, { retry: false });
    try {
      server.use(
        http.get(apiUrl('/projects'), () =>
          HttpResponse.json(errorBody('INTERNAL_ERROR', 'Something went wrong'), { status: 500 }),
        ),
      );
      renderApp('/projects');

      expect(
        await screen.findByRole('heading', { name: 'تعذّر تحميل مشاريعك' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
      expect(screen.getByText('خطأ 500 · خطأ داخلي في الخادم')).toBeInTheDocument();
    } finally {
      queryClient.setQueryDefaults(qk.projects, {});
    }
  });
});
