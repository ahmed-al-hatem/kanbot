import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssistant } from '@/stores/assistant';
import { useNotFound } from '@/stores/notFound';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodoDb, todoHandlers } from '@/test/todos';
import { AppErrorBoundary } from './AppErrorBoundary';
import { RouteErrorBoundary } from './RouteErrorBoundary';

/** Arabic (R4): the 404 page (titles, causes, Ask AI) and the error boundaries. */

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
  await import('./RenderErrorPage');
}, 30_000);

beforeEach(async () => {
  useNotFound.setState({ cause: null });
  server.use(
    http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })),
    ...todoHandlers(makeTodoDb()),
    ...projectHandlers(),
  );
  // React and React Router report caught errors on the console; that's expected here.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  await switchToArabic();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const signIn = () => {
  useSession.setState({ token: 'test.jwt.token' });
};
const heading = (name: string) =>
  screen.findByRole('heading', { name, level: 1 }, { timeout: 3000 });

describe('404 in Arabic', () => {
  it('an unknown route: the page, its title and actions in Arabic, with axe', async () => {
    signIn();
    renderApp('/teams/42');

    expect(await heading('لم نعثر على هذه الصفحة')).toBeInTheDocument();
    expect(screen.getByText('خطأ 404')).toBeInTheDocument();
    expect(screen.getByText(/قد يكون الرابط معطّلًا/)).toBeInTheDocument();
    expect(screen.getByText('العنوان المطلوب:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الذهاب إلى المشاريع' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(document.title).toBe('لم نعثر على هذه الصفحة · Kanbot');
    await expectNoAxeViolations(screen.getByRole('main'));
  });

  it('a missing sprint offers the active sprint; Ask AI fills the composer in Arabic', async () => {
    signIn();
    const user = userEvent.setup();
    renderApp('/projects/p1/sprints/nope');

    expect(await heading('هذا السبرنت غير موجود')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'فتح السبرنت النشط' })).toHaveAttribute(
      'href',
      '/projects/p1/board',
    );
    expect(document.title).toBe('لم نعثر على هذه الصفحة · Kanbot');

    await user.click(
      await screen.findByRole('button', { name: 'اطلب من الذكاء الاصطناعي إيجادها' }),
    );
    const drawer = await screen.findByRole('dialog', { name: 'مساعد Kanbot' });
    const composer = within(drawer).getByRole<HTMLTextAreaElement>('textbox', {
      name: 'راسل Kanbot',
    });
    expect(composer.value).toBe(
      'حاولت فتح /projects/p1/sprints/nope فظهرت «لم نعثر على هذه الصفحة». هل يمكنك مساعدتي في إيجاد ما كنت أبحث عنه؟',
    );
    expect(useAssistant.getState().chats.p1 ?? []).toHaveLength(0);
  });

  it('signed out: the same Arabic content without the shell', async () => {
    renderApp('/nowhere');
    expect(await heading('لم نعثر على هذه الصفحة')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الذهاب إلى المشاريع' })).toBeInTheDocument();
    expect(document.title).toBe('لم نعثر على هذه الصفحة · Kanbot');
  });
});

describe('error pages in Arabic', () => {
  it('a page that crashed: the render-error page in Arabic, with axe and the title', async () => {
    const user = userEvent.setup();
    let fail = true;
    function Flaky() {
      if (fail) throw new Error('Render failed');
      return <h1>Recovered</h1>;
    }
    const router = createMemoryRouter([
      { path: '/', ErrorBoundary: RouteErrorBoundary, Component: Flaky },
    ]);
    const { container } = render(<RouterProvider router={router} />);

    expect(await heading('حدث خطأ ما')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'تعذّر تحميل هذه الصفحة' })).toBeInTheDocument();
    expect(document.title).toBe('حدث خطأ ما · Kanbot');
    await expectNoAxeViolations(container);

    fail = false;
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByRole('heading', { name: 'Recovered' })).toBeInTheDocument();
  });

  it('a missing chunk after a deploy asks for a reload in Arabic', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        ErrorBoundary: RouteErrorBoundary,
        hydrateFallbackElement: <p>…</p>,
        lazy: () =>
          Promise.reject(
            new TypeError('Failed to fetch dynamically imported module: /assets/x.js'),
          ),
      },
    ]);
    render(<RouterProvider router={router} />);

    expect(await heading('يتوفر إصدار جديد')).toBeInTheDocument();
    expect(screen.getByText('تحديث')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة التحميل' })).toBeInTheDocument();
    expect(document.title).toBe('يتوفر تحديث · Kanbot');
  });

  it('the last-line crash screen reads in Arabic', () => {
    function Boom(): never {
      throw new Error('Crashed outside the router');
    }
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'حدث خطأ ما', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة التحميل' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الذهاب إلى المشاريع' })).toHaveAttribute(
      'href',
      '/projects',
    );
    expect(document.title).toBe('حدث خطأ ما · Kanbot');
  });
});
