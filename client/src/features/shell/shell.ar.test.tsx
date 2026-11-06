import { onlineManager } from '@tanstack/react-query';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { useShortcuts } from '@/stores/shortcuts';
import { expectNoAxeViolations } from '@/test/axe';
import { sentence, switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';

/** Arabic (R2): the sidebar, project switcher, profile menu, mobile bar, shortcuts and offline banner. */

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
}, 30_000);

beforeEach(async () => {
  useShortcuts.setState({ helpOpen: false });
  useSession.setState({ token: 'test.jwt.token' });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...projectHandlers(),
  );
  await switchToArabic();
});

afterEach(() => {
  onlineManager.setOnline(true);
});

const nav = () => screen.findByRole('navigation', { name: 'القائمة الرئيسية' });

describe('shell in Arabic', () => {
  it('names the nav, its links, the skip link, the switcher and the mobile bar in Arabic, with axe', async () => {
    renderApp('/projects/p1/board');

    const main = await nav();
    const links = within(main);
    expect(await links.findByRole('link', { name: 'السبرنت النشط' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(links.getByRole('link', { name: 'قائمة الانتظار' })).toHaveAttribute(
      'href',
      '/projects/p1/backlog',
    );
    expect(links.getByRole('link', { name: 'السبرنتات' })).toHaveAttribute(
      'href',
      '/projects/p1/sprints',
    );
    expect(links.getByRole('link', { name: 'المشاريع' })).not.toHaveAttribute('aria-current');
    expect(links.getByText('المشروع')).toBeInTheDocument();
    expect(
      await links.findByRole('button', { name: 'تبديل المشروع، الحالي: Kanbot App KAN' }),
    ).toBeInTheDocument();
    expect(links.getByRole('button', { name: 'English — تغيير اللغة' })).toBeInTheDocument();
    expect(links.getByRole('button', { name: /^التبديل إلى الوضع/ })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'تخطَّ إلى المحتوى الرئيسي' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('button', { name: 'التنقل' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getAllByRole('button', { name: 'اسأل الذكاء الاصطناعي' }).length).toBeGreaterThan(
      0,
    );

    await expectNoAxeViolations(main);
  });

  it('the project switcher menu reads in Arabic', async () => {
    const user = userEvent.setup();
    renderApp('/projects/p1/backlog');

    await user.click(
      await screen.findByRole('button', { name: /^تبديل المشروع، الحالي: Kanbot App/ }),
    );
    const menu = await screen.findByRole('menu', { name: 'المشاريع' });
    expect(within(menu).getByText('مشاريعك')).toBeInTheDocument();
    const current = within(menu).getByRole('menuitem', { name: /Kanbot App/ });
    expect(within(current).getByRole('img', { name: 'الحالي' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'عرض كل المشاريع' })).toBeInTheDocument();
    await expectNoAxeViolations(menu);
  });

  it('the profile menu and the shortcuts dialog read in Arabic', async () => {
    const user = userEvent.setup();
    renderApp('/projects');
    await screen.findByRole('heading', { name: 'Kanbot App' });

    await user.click(screen.getByRole('button', { name: new RegExp(TEST_USER.name) }));
    const menu = await screen.findByRole('menu', { name: 'الحساب' });
    expect(
      within(menu).getByText(sentence(`مسجّل الدخول باسم ${TEST_USER.email}`)),
    ).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'تسجيل الخروج' })).toBeInTheDocument();
    await user.click(within(menu).getByRole('menuitem', { name: /اختصارات لوحة المفاتيح/ }));

    const dialog = await screen.findByRole('dialog', { name: 'اختصارات لوحة المفاتيح' });
    expect(dialog).toHaveTextContent('الذهاب إلى لوحة السبرنت النشط');
    expect(dialog).toHaveTextContent('ثم');
    expect(within(dialog).getAllByRole('button', { name: 'إغلاق' })).toHaveLength(2);
    await expectNoAxeViolations(dialog);
  });

  it('logging out lands on the Arabic login', async () => {
    const user = userEvent.setup();
    renderApp('/projects');
    await screen.findByRole('heading', { name: 'Kanbot App' });

    await user.click(screen.getByRole('button', { name: new RegExp(TEST_USER.name) }));
    await user.click(await screen.findByRole('menuitem', { name: 'تسجيل الخروج' }));

    expect(await screen.findByRole('heading', { name: 'أهلًا بعودتك' })).toBeInTheDocument();
  });

  it('the offline banner and the "back online" toast read in Arabic', async () => {
    renderApp('/projects');
    await screen.findByRole('heading', { name: 'Kanbot App' });

    act(() => {
      onlineManager.setOnline(false);
    });
    expect(
      await screen.findByText('أنت غير متصل. لا يمكن حفظ التغييرات حتى يعود الاتصال.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أعد المحاولة الآن' })).toBeInTheDocument();

    act(() => {
      onlineManager.setOnline(true);
    });
    expect(await screen.findByText('عاد الاتصال')).toBeInTheDocument();
  });
});
