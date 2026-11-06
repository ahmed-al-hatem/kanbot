import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { switchToArabic } from '@/test/locale';
import { projectHandlers } from '@/test/projects';
import { preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import {
  makeSprint,
  makeTodo,
  makeTodoDb,
  SPRINT_3,
  SPRINT_4,
  todoHandlers,
  type TodoDb,
} from '@/test/todos';

/** Arabic (R4): the Sprints history — list, detail (live and snapshot), empty, 404 and titles. */

beforeAll(async () => {
  await preloadPages();
  await import('@/i18n/messages/ar');
}, 30_000);

/** Completed with 6 todos: 4 done, 15 of 20 points, 2 carried over. */
const SPRINT_2 = makeSprint({
  id: 's2',
  name: 'Sprint 2',
  status: 'completed',
  startDate: '2026-10-06',
  endDate: '2026-10-19',
  goal: 'Board MVP',
  completedAt: '2026-10-19T12:00:00.000Z',
  completedStats: {
    totalTodos: 6,
    doneTodos: 4,
    totalPoints: 20,
    donePoints: 15,
    byStatus: { todo: 1, in_progress: 1, in_review: 0, done: 4 },
    carriedOver: 2,
  },
});

function historyDb(sprints = [SPRINT_3, SPRINT_4, SPRINT_2]): TodoDb {
  return makeTodoDb(
    [
      makeTodo({
        id: 'a1',
        key: 'KAN-21',
        title: 'Validate signup form',
        sprintId: 's3',
        storyPoints: 3,
      }),
      makeTodo({
        id: 'a2',
        key: 'KAN-15',
        title: 'Set up routing',
        sprintId: 's3',
        status: 'done',
        storyPoints: 5,
      }),
      makeTodo({
        id: 'd1',
        key: 'KAN-10',
        title: 'Board columns',
        sprintId: 's2',
        status: 'done',
        storyPoints: 5,
      }),
      makeTodo({
        id: 'd2',
        key: 'KAN-11',
        title: 'Card layout',
        sprintId: 's2',
        status: 'done',
        storyPoints: 5,
        order: 1,
      }),
    ],
    sprints,
  );
}

function start(todoDb: TodoDb) {
  server.use(...todoHandlers(todoDb), ...projectHandlers());
}

beforeEach(async () => {
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
  await switchToArabic();
});

const detail = () => screen.getByRole('region', { name: /^Sprint/ });
/** A stat tile by its label. */
const tile = (label: string) =>
  within(detail()).getByText(label, { selector: '.label' }).parentElement;
const sprintList = () => screen.getByRole('navigation', { name: 'كل السبرنتات' });

describe('sprints history in Arabic', () => {
  it('the list and the active sprint read in Arabic, with axe and the page title', async () => {
    start(historyDb());
    const { container } = renderApp('/projects/p1/sprints');

    expect(
      await screen.findByRole('heading', { name: 'Sprint 3', level: 2 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'السبرنتات', level: 1 })).toBeInTheDocument();
    expect(document.title).toBe('Sprint 3 · السبرنتات · Kanbot App · Kanbot');
    expect(screen.getByText('3 سبرنتات')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إنشاء سبرنت' })).toBeInTheDocument();

    const links = within(sprintList()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringMatching(/^Sprint 3نشط2 تشرين الثاني – 15 تشرين الثاني5 \/ 8 نقاط$/),
      expect.stringMatching(/^Sprint 4مخططبلا تواريخ0 \/ 0 نقطة$/),
      expect.stringMatching(/^Sprint 2مكتمل6 تشرين الأول – 19 تشرين الأول15 \/ 20 نقطة$/),
    ]);
    expect(
      within(links[0]!).getByRole('progressbar', { name: 'النقاط المنجزة في Sprint 3' }),
    ).toHaveAttribute('aria-valuetext', '5 من 8 نقاط منجزة');

    // The active sprint: live stats.
    expect(tile('البنود المكتملة')).toHaveTextContent('بند واحد');
    expect(tile('النقاط المنجزة')).toHaveTextContent('5 / 8');
    expect(tile('نسبة الإنجاز')).toHaveTextContent('63%');
    expect(tile('غير منجز')).toHaveTextContent('بند واحد');
    expect(await screen.findByRole('list', { name: 'بنود Sprint 3' })).toBeInTheDocument();
    // The count sits in its own span after the heading text.
    expect(within(detail()).getByRole('heading', { name: /^البنود/, level: 3 })).toHaveTextContent(
      'البنود · 2',
    );
    expect(within(detail()).getByText('للتنفيذ')).toBeInTheDocument();
    expect(within(detail()).getAllByText('منجز').length).toBeGreaterThan(0);

    await expectNoAxeViolations(container);
  });

  it('a completed sprint shows its snapshot in Arabic', async () => {
    start(historyDb());
    renderApp('/projects/p1/sprints/s2');

    expect(
      await screen.findByRole('heading', { name: 'Sprint 2', level: 2 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Sprint 2 · السبرنتات · Kanbot App · Kanbot');
    expect(within(detail()).getByText('مكتمل')).toBeInTheDocument();
    expect(
      within(detail()).getByText(/^6 تشرين الأول – 19 تشرين الأول · اكتمل في /),
    ).toBeInTheDocument();
    expect(screen.getByText(/Board MVP/)).toHaveTextContent('الهدف: Board MVP');
    expect(tile('البنود المكتملة')).toHaveTextContent('4 بنود');
    expect(tile('النقاط المنجزة')).toHaveTextContent('15 / 20');
    expect(tile('نسبة الإنجاز')).toHaveTextContent('75%');
    expect(tile('المُرحَّل')).toHaveTextContent('بندان');
    expect(screen.getByText('الأرقام كما كانت عند إكمال السبرنت.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Board columns' })).toBeInTheDocument();
  });

  it('a planned sprint without todos says so in Arabic', async () => {
    start(historyDb());
    renderApp('/projects/p1/sprints/s4');

    expect(
      await screen.findByRole('heading', { name: 'Sprint 4', level: 2 }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(within(detail()).getByText('لا تواريخ بعد')).toBeInTheDocument();
    expect(tile('المُرحَّل')).toHaveTextContent('—');
    expect(
      await screen.findByText('لا بنود مخططة بعد. اسحب بعضها من قائمة الانتظار.'),
    ).toBeInTheDocument();
  });

  it('the empty state reads in Arabic, with axe', async () => {
    start(makeTodoDb([], []));
    const { container } = renderApp('/projects/p1/sprints');

    expect(
      await screen.findByRole('heading', { name: 'لا توجد سبرنتات بعد' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('لا سبرنتات')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الذهاب إلى قائمة الانتظار' })).toHaveAttribute(
      'href',
      '/projects/p1/backlog',
    );
    expect(document.title).toBe('السبرنتات · Kanbot App · Kanbot');
    await expectNoAxeViolations(container);
  });
});
