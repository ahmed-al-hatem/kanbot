import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setLocale } from '@/i18n';
import { ar } from '@/i18n/messages/ar';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeTodoDb, todoHandlers } from '@/test/todos';
import type { DraftTodo } from '@/types/api';

/**
 * Arabic (R4): the AI drawer and dialogs. Our chrome is translated; the server's replies (mock or
 * real) are data and render as they come; AI errors read through i18n/errors.ts.
 */

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
}, 30_000);

const REPLY = 'Sprint 3 is **on track**.';
const AI_ERROR_TEXT = 'The AI service returned something unusable.';
const RATE_LIMIT_TEXT = 'Too many AI requests. Wait a minute and try again.';

const DRAFTS: DraftTodo[] = [
  {
    title: 'Design the profile page',
    description: '',
    type: 'task',
    priority: 'high',
    storyPoints: 2,
  },
  { title: 'Avatar upload API', description: '', type: 'story', priority: 'high', storyPoints: 5 },
  { title: 'Crop the avatar', description: '', type: 'task', priority: 'medium', storyPoints: 3 },
  { title: 'Profile empty state', description: '', type: 'task', priority: 'low', storyPoints: 1 },
  {
    title: 'Fix avatar caching',
    description: '',
    type: 'bug',
    priority: 'medium',
    storyPoints: null,
  },
];

function start() {
  server.use(
    http.post(apiUrl('/projects/:projectId/ai/chat'), () =>
      HttpResponse.json({ message: { role: 'assistant', content: REPLY }, source: 'mock' }),
    ),
    http.post(apiUrl('/projects/:projectId/ai/generate-todos'), () =>
      HttpResponse.json({ todos: DRAFTS, source: 'mock' }),
    ),
    http.post(apiUrl('/projects/:projectId/ai/plan-sprint'), () =>
      HttpResponse.json({
        goal: 'Stabilise login',
        todoIds: ['t3', 't2'],
        totalPoints: 5,
        reasoning: 'Picked 2 todos by priority.',
        source: 'mock',
      }),
    ),
    ...todoHandlers(makeTodoDb()),
    ...projectHandlers(),
  );
}

beforeEach(async () => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
  await switchToArabic();
});

const DRAWER = 'مساعد Kanbot';
const drawer = () => screen.getByRole('dialog', { name: DRAWER });
const log = () => within(drawer()).getByRole('log', { name: 'المحادثة' });
const composer = () => within(drawer()).getByRole('textbox', { name: 'راسل Kanbot' });
const live = () => screen.getByTestId('live-polite');

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  const askAi = (
    await screen.findAllByRole('button', { name: 'اسأل الذكاء الاصطناعي' }, { timeout: 3000 })
  )[0]!;
  await user.click(askAi);
  return screen.findByRole('dialog', { name: DRAWER });
}

function failChat(code: 'AI_ERROR' | 'RATE_LIMITED', message: string, status: number) {
  server.use(
    http.post(apiUrl('/projects/:projectId/ai/chat'), () =>
      HttpResponse.json(errorBody(code, message), { status }),
    ),
  );
}

describe('AI drawer in Arabic', () => {
  it('the empty state, quick actions and composer read in Arabic, with axe', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    expect(within(drawer()).getByText('قد يخطئ الذكاء الاصطناعي')).toBeInTheDocument();
    expect(
      within(drawer()).getByRole('heading', { name: 'كيف أساعدك في السبرنت؟' }),
    ).toBeInTheDocument();
    expect(within(drawer()).getByText(ar.ai.drawer.emptyText)).toBeInTheDocument();
    for (const example of ar.ai.drawer.examples.backlog) {
      expect(within(drawer()).getByRole('button', { name: example })).toBeInTheDocument();
    }
    const quick = within(within(drawer()).getByRole('group', { name: 'إجراءات سريعة' }));
    for (const name of ['إنشاء بنود', 'تخطيط السبرنت', 'لخّص السبرنت']) {
      expect(quick.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(within(drawer()).getByRole('button', { name: 'محادثة جديدة' })).toBeDisabled();
    expect(within(drawer()).getByRole('button', { name: 'إغلاق المساعد' })).toBeInTheDocument();
    expect(composer()).toHaveAttribute('placeholder', 'اسأل Kanbot…');
    expect(within(drawer()).getByRole('button', { name: 'إرسال' })).toBeDisabled();
    expect(
      within(drawer()).getByText('قد يخطئ الذكاء الاصطناعي. راجع قبل الحفظ.'),
    ).toBeInTheDocument();
    // The API's own name for its mode stays as it is (glossary).
    expect(await within(drawer()).findByText('Mock AI')).toBeInTheDocument();
    await expectNoAxeViolations(drawer());
  });

  it('a reply renders as the server sent it, inside Arabic chrome', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'كيف يسير السبرنت؟{Enter}');
    expect(await within(log()).findByText(/on track/)).toBeInTheDocument();
    expect(within(log()).getByText('كيف يسير السبرنت؟')).toBeInTheDocument();
    expect(within(log()).getByText('قلت:')).toBeInTheDocument();
    expect(within(log()).getByText('قال Kanbot:')).toBeInTheDocument();
    expect(within(log()).getByRole('button', { name: 'نسخ' })).toBeInTheDocument();
    await waitFor(() => {
      expect(live()).toHaveTextContent('أجاب Kanbot');
    });
    await expectNoAxeViolations(drawer());
  });

  it('AI_ERROR reads in Arabic, never the server English, with Try again', async () => {
    const user = userEvent.setup();
    start();
    failChat('AI_ERROR', AI_ERROR_TEXT, 502);
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'خطّط لأسبوعي{Enter}');
    const alert = await within(log()).findByRole('alert');
    expect(alert).toHaveTextContent('تعذّر على Kanbot الرد');
    expect(alert).toHaveTextContent(ar.errors.server.AI_ERROR(''));
    expect(alert).toHaveTextContent('رسالتك محفوظة.');
    expect(alert).not.toHaveTextContent(AI_ERROR_TEXT);
    expect(within(alert).getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });

  it('RATE_LIMITED reads in Arabic', async () => {
    const user = userEvent.setup();
    start();
    failChat('RATE_LIMITED', RATE_LIMIT_TEXT, 429);
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'مرحبًا{Enter}');
    const alert = await within(log()).findByRole('alert');
    expect(alert).toHaveTextContent(ar.errors.server.RATE_LIMITED(''));
    expect(alert).not.toHaveTextContent(RATE_LIMIT_TEXT);
  });

  it('a visible AI error switches language with the UI', async () => {
    const user = userEvent.setup();
    start();
    failChat('AI_ERROR', AI_ERROR_TEXT, 502);
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'مرحبًا{Enter}');
    const alert = await within(log()).findByRole('alert');
    expect(alert).toHaveTextContent(ar.errors.server.AI_ERROR(''));

    await act(() => setLocale('en'));
    const english = within(screen.getByRole('dialog', { name: 'Kanbot Assistant' })).getByRole(
      'alert',
    );
    expect(english).toHaveTextContent("Kanbot couldn't answer");
    expect(english).toHaveTextContent(AI_ERROR_TEXT);
    expect(within(english).getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    await act(() => setLocale('ar'));
    const arabic = within(drawer()).getByRole('alert');
    expect(arabic).toHaveTextContent('تعذّر على Kanbot الرد');
    expect(arabic).not.toHaveTextContent(AI_ERROR_TEXT);
  });
});

describe('Generate todos in Arabic', () => {
  it('validation, drafts, totals and the toast read in Arabic, with axe', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');

    await user.click(
      (await screen.findAllByRole('button', { name: 'توليد البنود' }, { timeout: 3000 }))[0]!,
    );
    const dialog = await screen.findByRole('dialog', { name: 'توليد البنود بالذكاء الاصطناعي' });
    expect(within(dialog).getByText('لا تُحفظ المسودات حتى تضيفها.')).toBeInTheDocument();
    expect(within(dialog).getByText(ar.ai.generate.intro)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'توليد' }));
    expect(
      await within(dialog).findByText('صف الميزة ليعرف Kanbot ما الذي يجب تقسيمه'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(live()).toHaveTextContent('حقل واحد يحتاج إلى انتباه');
    });

    const description = within(dialog).getByRole('textbox', { name: /صف الميزة/ });
    expect(description).toHaveAttribute('placeholder', 'مثال: صفحة الملف الشخصي مع رفع الصورة');
    await user.type(description, 'Profile page');
    await user.click(within(dialog).getByRole('button', { name: 'توليد' }));

    expect(
      await within(dialog).findByRole('heading', { name: 'البنود المقترحة (5)' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(live()).toHaveTextContent('5 مسودات بنود جاهزة للمراجعة');
    });
    // Draft titles are the AI's data; the controls around them are Arabic.
    expect(
      within(dialog).getByRole('checkbox', { name: 'تضمين Design the profile page' }),
    ).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'تحديد الكل' })).toBeChecked();
    const type = within(dialog).getByRole('combobox', { name: 'نوع المسودة 1' });
    expect(
      within(type)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['قصة', 'مهمة', 'خلل']);
    expect(within(dialog).getByRole('combobox', { name: 'أولوية المسودة 1' })).toHaveDisplayValue(
      'عالية',
    );
    expect(within(dialog).getByRole('combobox', { name: 'نقاط المسودة 5' })).toHaveDisplayValue(
      'غير مقدّر',
    );
    expect(within(dialog).getByText('11 نقطة').parentElement).toHaveTextContent('11 نقطة إجمالًا');
    expect(within(dialog).getByRole('button', { name: 'إعادة التوليد' })).toBeInTheDocument();
    await expectNoAxeViolations(dialog);

    await user.click(within(dialog).getByRole('checkbox', { name: 'تضمين Fix avatar caching' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'تضمين Profile empty state' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'تضمين Crop the avatar' }));
    const add = within(dialog).getByRole('button', { name: 'إضافة بندين إلى قائمة الانتظار' });
    await user.click(add);

    expect(await screen.findByText('أُضيف بندان إلى قائمة الانتظار')).toBeInTheDocument();
  });

  it('RATE_LIMITED in the generate dialog reads in Arabic', async () => {
    const user = userEvent.setup();
    start();
    server.use(
      http.post(apiUrl('/projects/:projectId/ai/generate-todos'), () =>
        HttpResponse.json(errorBody('RATE_LIMITED', RATE_LIMIT_TEXT), { status: 429 }),
      ),
    );
    renderApp('/projects/p1/backlog');

    await user.click(
      (await screen.findAllByRole('button', { name: 'توليد البنود' }, { timeout: 3000 }))[0]!,
    );
    const dialog = await screen.findByRole('dialog', { name: 'توليد البنود بالذكاء الاصطناعي' });
    await user.type(within(dialog).getByRole('textbox', { name: /صف الميزة/ }), 'Notifications');
    await user.click(within(dialog).getByRole('button', { name: 'توليد' }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('تعذّر على Kanbot توليد البنود الآن');
    expect(alert).toHaveTextContent(ar.errors.server.RATE_LIMITED(''));
    expect(alert).toHaveTextContent('وصفك محفوظ — حاول مجددًا.');
    expect(alert).not.toHaveTextContent(RATE_LIMIT_TEXT);
  });
});

describe('Plan sprint in Arabic', () => {
  it('capacity, the plan, over capacity and Create read in Arabic, with axe', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');

    await user.click(
      await screen.findByRole('button', { name: 'تخطيط السبرنت' }, { timeout: 3000 }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'تخطيط السبرنت بالذكاء الاصطناعي' });
    expect(await within(dialog).findByText(/^يختار Kanbot من قائمة الانتظار/)).toBeInTheDocument();

    const capacity = within(dialog).getByRole('spinbutton', { name: /السعة \(نقاط القصة\)/ });
    await user.clear(capacity);
    await user.tab();
    expect(
      await within(dialog).findByText('أدخل عددًا صحيحًا من النقاط من 1 إلى 200'),
    ).toBeInTheDocument();
    await user.type(capacity, '20');
    expect(within(dialog).getByRole('textbox', { name: /التركيز \/ الهدف/ })).toHaveAttribute(
      'placeholder',
      'مثال: إنهاء الملف الشخصي',
    );
    await user.click(within(dialog).getByRole('button', { name: 'اقترح خطة' }));

    expect(await within(dialog).findByRole('textbox', { name: 'هدف السبرنت المقترح' })).toHaveValue(
      'Stabilise login',
    );
    expect(within(dialog).getByText('بندان · 5 / 20 نقطة')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'اقتراح الذكاء الاصطناعي' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'لماذا هذه الخطة؟' })).toBeInTheDocument();
    // The model's reasoning is data.
    expect(within(dialog).getByText('Picked 2 todos by priority.')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('heading', { name: 'بنود قائمة الانتظار' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^إنشاء Sprint 5 ببندين$/ })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'اقترح مجددًا' })).toBeInTheDocument();
    await waitFor(() => {
      expect(live()).toHaveTextContent('الخطة جاهزة: بندان، 5 من 20 نقطة');
    });
    await expectNoAxeViolations(dialog);

    await user.clear(capacity);
    await user.type(capacity, '4');
    expect(await within(dialog).findByText(/^تجاوزت السعة بـ 1 نقطة/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^إنشاء Sprint 5/ })).toBeDisabled();
  });
});
