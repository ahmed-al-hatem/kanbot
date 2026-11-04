import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useAssistant } from '@/stores/assistant';
import { useSession } from '@/stores/session';
import { expectNoAxeViolations } from '@/test/axe';
import { projectHandlers } from '@/test/projects';
import { errorBody, preloadPages, renderApp, TEST_USER } from '@/test/renderApp';
import { apiUrl, server } from '@/test/server';
import { makeSprint, makeTodoDb, SPRINT_3, SPRINT_4, todoHandlers, type TodoDb } from '@/test/todos';
import type { ChatRequest, DraftTodo, GenerateTodosRequest, PlanSprintRequest, Sprint } from '@/types/api';

let db: TodoDb;
let chatCalls: ChatRequest[];
let generateCalls: GenerateTodosRequest[];
let planCalls: PlanSprintRequest[];
let summaryCalls: string[];

beforeAll(preloadPages, 30_000);

const REPLY = '**Bold** answer <img src="x" onerror="alert(1)"> and a [link](https://example.com).';

const DRAFTS: DraftTodo[] = [
  { title: 'Design the profile page', description: 'Layout', type: 'task', priority: 'high', storyPoints: 2 },
  { title: 'Avatar upload API', description: '', type: 'story', priority: 'high', storyPoints: 5 },
  { title: 'Crop the avatar', description: '', type: 'task', priority: 'medium', storyPoints: 3 },
  { title: 'Profile empty state', description: '', type: 'task', priority: 'low', storyPoints: 1 },
  { title: 'Fix avatar caching', description: '', type: 'bug', priority: 'medium', storyPoints: null },
];

const COMPLETED: Sprint = makeSprint({
  id: 's2',
  name: 'Sprint 2',
  status: 'completed',
  startDate: '2026-10-19',
  endDate: '2026-11-01',
  completedAt: '2026-11-01T17:00:00.000Z',
  completedStats: {
    totalTodos: 4,
    doneTodos: 3,
    totalPoints: 10,
    donePoints: 8,
    byStatus: { todo: 1, in_progress: 0, in_review: 0, done: 3 },
    carriedOver: 1,
  },
  summary: {
    content: '## Highlights\n\n- Shipped **login** (KAN-31 [id:t2])',
    source: 'mock',
    generatedAt: '2026-11-01T17:05:00.000Z',
  },
});

/** The AI endpoints, recording what was sent. Tests override one with `server.use` to fail it. */
function aiHandlers() {
  return [
    http.post(apiUrl('/projects/:projectId/ai/chat'), async ({ request }) => {
      chatCalls.push((await request.json()) as ChatRequest);
      return HttpResponse.json({ message: { role: 'assistant', content: REPLY }, source: 'mock' });
    }),
    http.post(apiUrl('/projects/:projectId/ai/generate-todos'), async ({ request }) => {
      const body = (await request.json()) as GenerateTodosRequest;
      generateCalls.push(body);
      return HttpResponse.json({ todos: DRAFTS.slice(0, body.count ?? 5), source: 'mock' });
    }),
    http.post(apiUrl('/projects/:projectId/ai/plan-sprint'), async ({ request }) => {
      planCalls.push((await request.json()) as PlanSprintRequest);
      return HttpResponse.json({
        goal: 'Stabilise login',
        todoIds: ['t3', 't2'],
        totalPoints: 5,
        reasoning: 'Picked 2 todos (1 urgent, 1 medium) by priority, bugs first, for 5 of 20 points.',
        source: 'mock',
      });
    }),
    http.post(apiUrl('/sprints/:sprintId/ai/summary'), ({ params }) => {
      const sprint = db.sprints.find((item) => item.id === params.sprintId);
      if (!sprint) return HttpResponse.json(errorBody('NOT_FOUND', 'Sprint not found'), { status: 404 });
      summaryCalls.push(sprint.id);
      const summary = {
        content: `## ${sprint.name} summary\n\n- Version ${summaryCalls.length}`,
        source: 'mock' as const,
        generatedAt: '2026-11-04T10:00:00.000Z',
      };
      sprint.summary = summary;
      return HttpResponse.json({ sprint, summary });
    }),
  ];
}

function start(todoDb: TodoDb = makeTodoDb()) {
  db = todoDb;
  server.use(...aiHandlers(), ...todoHandlers(db), ...projectHandlers());
}

beforeEach(() => {
  chatCalls = [];
  generateCalls = [];
  planCalls = [];
  summaryCalls = [];
  useSession.setState({ token: 'test.jwt.token' });
  server.use(http.get(apiUrl('/auth/me'), () => HttpResponse.json({ user: TEST_USER })));
});

const drawer = () => screen.getByRole('dialog', { name: 'Kanbot Assistant' });
const composer = () => within(drawer()).getByRole('textbox', { name: 'Message Kanbot' });
const log = () => within(drawer()).getByRole('log', { name: 'Conversation' });

async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  const askAi = (await screen.findAllByRole('button', { name: 'Ask AI' }, { timeout: 3000 }))[0]!;
  await user.click(askAi);
  return screen.findByRole('dialog', { name: 'Kanbot Assistant' });
}

describe('assistant drawer (AI-1, AI-5)', () => {
  it('shows the Mock AI badge only in mock mode', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');

    await openDrawer(user);
    expect(await within(drawer()).findByText('Mock AI')).toBeInTheDocument();
    expect(within(drawer()).getByText('AI can make mistakes')).toBeInTheDocument();
    expect(within(drawer()).getByText('AI can make mistakes. Review before saving.')).toBeInTheDocument();
    await expectNoAxeViolations(drawer());
  });

  it('has no Mock AI badge with a real model', async () => {
    const user = userEvent.setup();
    start();
    server.use(http.get(apiUrl('/ai/status'), () => HttpResponse.json({ mode: 'ai', model: 'some-model' })));
    renderApp('/projects/p1/backlog');

    await openDrawer(user);
    await waitFor(() => {
      expect(within(drawer()).getByRole('button', { name: 'Create todos' })).toBeInTheDocument();
    });
    expect(within(drawer()).queryByText('Mock AI')).not.toBeInTheDocument();
  });

  it('sends the whole conversation and renders the answer as Markdown without raw HTML', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'How is the sprint going?{Enter}');
    expect(within(log()).getByText('How is the sprint going?')).toBeInTheDocument();
    const bold = await within(log()).findByText('Bold');
    expect(bold.tagName).toBe('STRONG');
    // The <img> is shown as text, never parsed into an element (NFR-7).
    expect(log().querySelector('img')).toBeNull();
    expect(within(log()).getByText(/<img src="x"/)).toBeInTheDocument();
    const link = within(log()).getByRole('link', { name: 'link' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(composer()).toHaveValue('');

    // Copy takes what is shown, not the Markdown source.
    await user.click(within(log()).getByRole('button', { name: 'Copy' }));
    expect(await navigator.clipboard.readText()).toBe('Bold answer <img src="x" onerror="alert(1)"> and a link.');

    await user.type(composer(), 'What next?{Enter}');
    await waitFor(() => {
      expect(chatCalls).toHaveLength(2);
    });
    expect(chatCalls[0]).toEqual({ messages: [{ role: 'user', content: 'How is the sprint going?' }] });
    expect(chatCalls[1]!.messages).toEqual([
      { role: 'user', content: 'How is the sprint going?' },
      { role: 'assistant', content: REPLY },
      { role: 'user', content: 'What next?' },
    ]);
    // One per answer; the first may still read "Copied" (it switches back after 2s).
    expect(await within(log()).findAllByRole('button', { name: /^Cop(y|ied)$/ })).toHaveLength(2);
  });

  it('trims the conversation to the last 30 messages', async () => {
    const user = userEvent.setup();
    start();
    useAssistant.setState({
      chats: {
        p1: Array.from({ length: 40 }, (_, i) => ({
          id: `old-${i}`,
          role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
          content: `Message ${i}`,
          createdAt: '2026-11-04T09:00:00.000Z',
        })),
      },
    });
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'Latest{Enter}');
    await waitFor(() => {
      expect(chatCalls).toHaveLength(1);
    });
    const sent = chatCalls[0]!.messages;
    expect(sent).toHaveLength(30);
    expect(sent.at(-1)).toEqual({ role: 'user', content: 'Latest' });
    expect(sent[0]).toEqual({ role: 'assistant', content: 'Message 11' });
  });

  it('sends on Enter and adds a new line on Shift+Enter', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');
    await openDrawer(user);

    await user.type(composer(), 'First line{Shift>}{Enter}{/Shift}second line');
    expect(composer()).toHaveValue('First line\nsecond line');
    expect(chatCalls).toHaveLength(0);

    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(chatCalls).toEqual([{ messages: [{ role: 'user', content: 'First line\nsecond line' }] }]);
    });
  });

  it('shows page-aware example prompts and sends one on click', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');
    await openDrawer(user);

    await user.click(within(drawer()).getByRole('button', { name: "What's blocking the active sprint?" }));
    await waitFor(() => {
      expect(chatCalls).toEqual([{ messages: [{ role: 'user', content: "What's blocking the active sprint?" }] }]);
    });
  });

  it('New chat clears the conversation', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'Hello{Enter}');
    await within(log()).findByText('Bold');
    await user.click(within(drawer()).getByRole('button', { name: 'New chat' }));

    expect(within(log()).queryByText('Hello')).not.toBeInTheDocument();
    expect(within(log()).getByRole('heading', { name: 'How can I help with your sprint?' })).toBeInTheDocument();
    expect(useAssistant.getState().chats.p1).toBeUndefined();
  });

  it('keeps the chat while closed and starts fresh in another project', async () => {
    const user = userEvent.setup();
    start();
    const { router } = renderApp('/projects/p1/backlog');
    await openDrawer(user);
    await user.type(composer(), 'Hello Kanbot{Enter}');
    await within(log()).findByText('Bold');

    // Closed and reopened: still there.
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Kanbot Assistant' })).not.toBeInTheDocument();
    });
    await openDrawer(user);
    expect(within(log()).getByText('Hello Kanbot')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    // Another project: its own (empty) chat.
    await act(async () => {
      await router.navigate('/projects/p2/backlog');
    });
    await screen.findByRole('heading', { name: 'Backlog', level: 1 }, { timeout: 3000 });
    await openDrawer(user);
    expect(within(log()).queryByText('Hello Kanbot')).not.toBeInTheDocument();
    expect(within(log()).getByRole('heading', { name: 'How can I help with your sprint?' })).toBeInTheDocument();
    // Saved per project, so the first project's chat is still there (and in localStorage).
    expect(useAssistant.getState().chats.p1?.map((entry) => entry.content)).toEqual(['Hello Kanbot', REPLY]);
    expect(window.localStorage.getItem('kanbot.chats')).toContain('Hello Kanbot');
  });

  it('shows the server message on 502 and sends the same conversation again with Try again', async () => {
    const user = userEvent.setup();
    start();
    let fail = true;
    server.use(
      http.post(apiUrl('/projects/:projectId/ai/chat'), async ({ request }) => {
        chatCalls.push((await request.json()) as ChatRequest);
        if (fail) {
          fail = false;
          return HttpResponse.json(errorBody('AI_ERROR', 'The AI service returned something unusable.'), { status: 502 });
        }
        return HttpResponse.json({ message: { role: 'assistant', content: 'Recovered answer' }, source: 'mock' });
      }),
    );
    renderApp('/projects/p1/backlog');
    await openDrawer(user);

    await user.type(composer(), 'Plan my week{Enter}');
    const alert = await within(log()).findByRole('alert');
    expect(alert).toHaveTextContent("Kanbot couldn't answer");
    expect(alert).toHaveTextContent('The AI service returned something unusable.');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(log()).findByText('Recovered answer')).toBeInTheDocument();
    expect(within(log()).queryByRole('alert')).not.toBeInTheDocument();
    expect(chatCalls[1]).toEqual(chatCalls[0]);
  });

  it('removes internal ids from answers and links this project\'s todo keys to their details', async () => {
    const user = userEvent.setup();
    start();
    server.use(
      http.post(apiUrl('/projects/:projectId/ai/chat'), () =>
        HttpResponse.json({
          message: {
            role: 'assistant',
            content: 'Review KAN-31 [id:t2] first, then KAN-32 [id: t3 ]. Ignore `KAN-31` and KAN-99.',
          },
          source: 'ai',
        }),
      ),
    );
    renderApp('/projects/p1/backlog');
    await openDrawer(user);
    await user.type(composer(), 'What first?{Enter}');

    const link = await within(log()).findByRole('link', { name: 'KAN-31' });
    expect(log()).not.toHaveTextContent('[id:');
    expect(link).toHaveAttribute('href', '?todo=t2');
    expect(link).not.toHaveAttribute('target');
    expect(within(log()).getByRole('link', { name: 'KAN-32' })).toHaveAttribute('href', '?todo=t3');
    // In code, and a key this project doesn't have: plain text.
    expect(within(log()).getAllByRole('link', { name: 'KAN-31' })).toHaveLength(1);
    expect(within(log()).queryByRole('link', { name: 'KAN-99' })).not.toBeInTheDocument();
    expect(within(log()).getByText('KAN-99', { exact: false })).toBeInTheDocument();

    // A key opens Todo details; the drawer closes so the dialog isn't under it.
    await user.click(link);
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Kanbot Assistant' })).not.toBeInTheDocument();
    });
    const details = await screen.findByRole('dialog', { name: /KAN-31/ });
    expect(within(details).getByRole('textbox', { name: /^Title/ })).toHaveValue('Login screen');
  });

  it('Summarize sprint asks for the active sprint summary and shows it in the chat', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');
    await openDrawer(user);

    await user.click(within(drawer()).getByRole('button', { name: 'Summarize sprint' }));
    expect(within(log()).getByText('Summarize Sprint 3')).toBeInTheDocument();
    expect(await within(log()).findByRole('heading', { name: 'Sprint 3 summary' })).toBeInTheDocument();
    expect(summaryCalls).toEqual(['s3']);
  });

  it('"Improve this todo" opens the drawer with a prompt about the todo, without sending it', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog?todo=t3');

    await user.click(await screen.findByRole('button', { name: 'Improve this todo' }, { timeout: 3000 }));
    await screen.findByRole('dialog', { name: 'Kanbot Assistant' });
    const prompt = (composer() as HTMLTextAreaElement).value;
    expect(prompt).toContain('Improve KAN-32');
    expect(prompt).toContain('Title: Fix crash on save');
    expect(composer()).toHaveFocus();
    expect(chatCalls).toHaveLength(0);
  });
});

describe('generate todos (AI-2)', () => {
  it('generates drafts, saves only the checked ones with their edits, and nothing before Add', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');

    const header = await screen.findAllByRole('button', { name: 'Generate todos' }, { timeout: 3000 });
    await user.click(header[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Generate todos with AI' });

    // Validated on submit: at least 3 characters.
    await user.click(within(dialog).getByRole('button', { name: 'Generate' }));
    expect(await within(dialog).findByText('Describe the feature so Kanbot knows what to break down')).toBeInTheDocument();
    expect(generateCalls).toHaveLength(0);

    await user.type(within(dialog).getByRole('textbox', { name: /Describe the feature/ }), 'User profile page with avatar upload');
    expect(within(dialog).getByText('36 / 2000')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Generate' }));

    const include = await within(dialog).findAllByRole('checkbox', { name: /^Include / });
    expect(include).toHaveLength(5);
    include.forEach((box) => {
      expect(box).toBeChecked();
    });
    expect(generateCalls).toEqual([{ prompt: 'User profile page with avatar upload', count: 5 }]);
    expect(db.calls.bulk).toHaveLength(0);
    expect(within(dialog).getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('checkbox', { name: 'Include Profile empty state' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'Include Fix avatar caching' }));
    const title = within(dialog).getByRole('textbox', { name: 'Title of draft 1' });
    await user.clear(title);
    await user.type(title, 'Profile page layout');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Priority of draft 2' }), 'urgent');
    expect(within(dialog).getByText('10 pts')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Add 3 todos to Backlog' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Generate todos with AI' })).not.toBeInTheDocument();
    });
    expect(db.calls.bulk).toEqual([
      [
        { title: 'Profile page layout', description: 'Layout', type: 'task', priority: 'high', storyPoints: 2 },
        { title: 'Avatar upload API', description: '', type: 'story', priority: 'urgent', storyPoints: 5 },
        { title: 'Crop the avatar', description: '', type: 'task', priority: 'medium', storyPoints: 3 },
      ],
    ]);
    expect(await screen.findByText('3 todos added to the backlog')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Profile page layout' })).toBeInTheDocument();
  });

  it('Select all toggles every draft and Add is disabled with none', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');
    await user.click((await screen.findAllByRole('button', { name: 'Generate todos' }, { timeout: 3000 }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Generate todos with AI' });
    await user.type(within(dialog).getByRole('textbox', { name: /Describe the feature/ }), 'Billing');
    await user.click(within(dialog).getByRole('button', { name: 'Generate' }));

    const selectAll = await within(dialog).findByRole('checkbox', { name: 'Select all' });
    await user.click(selectAll);
    expect(within(dialog).getByRole('button', { name: 'Add 0 todos to Backlog' })).toBeDisabled();
    await user.click(selectAll);
    expect(within(dialog).getByRole('button', { name: 'Add 5 todos to Backlog' })).toBeEnabled();
  });

  it('shows the 429 message in the AI error panel and keeps the description for Try again', async () => {
    const user = userEvent.setup();
    start();
    let fail = true;
    server.use(
      http.post(apiUrl('/projects/:projectId/ai/generate-todos'), async ({ request }) => {
        generateCalls.push((await request.json()) as GenerateTodosRequest);
        if (fail) {
          fail = false;
          return HttpResponse.json(errorBody('RATE_LIMITED', 'Too many AI requests. Wait a minute and try again.'), {
            status: 429,
          });
        }
        return HttpResponse.json({ todos: DRAFTS.slice(0, 2), source: 'mock' });
      }),
    );
    renderApp('/projects/p1/backlog');
    await user.click((await screen.findAllByRole('button', { name: 'Generate todos' }, { timeout: 3000 }))[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Generate todos with AI' });
    const description = within(dialog).getByRole('textbox', { name: /Describe the feature/ });
    await user.type(description, 'Notifications');
    await user.click(within(dialog).getByRole('button', { name: 'Generate' }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent("Kanbot couldn't generate todos right now");
    expect(alert).toHaveTextContent('Too many AI requests. Wait a minute and try again.');
    expect(description).toHaveValue('Notifications');
    expect(within(dialog).getByText('AI can make mistakes. Review before saving.')).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(dialog).findAllByRole('checkbox', { name: /^Include / })).toHaveLength(2);
    expect(generateCalls).toHaveLength(2);
    expect(generateCalls[1]).toEqual(generateCalls[0]);
  });

  it('a starter backlog from New project opens Generate todos pre-filled from the description', async () => {
    const user = userEvent.setup();
    start();
    const created = { id: 'p9', name: 'Mobile App', key: 'MOB', description: 'An app for field teams' };
    server.use(
      http.post(apiUrl('/projects'), () =>
        HttpResponse.json(
          {
            project: {
              ...created,
              createdAt: '2026-11-04T09:00:00.000Z',
              updatedAt: '2026-11-04T09:00:00.000Z',
              stats: { backlogCount: 0, totalTodos: 0, activeSprint: null },
            },
          },
          { status: 201 },
        ),
      ),
      http.get(apiUrl('/projects/p9'), () =>
        HttpResponse.json({
          project: {
            ...created,
            createdAt: '2026-11-04T09:00:00.000Z',
            updatedAt: '2026-11-04T09:00:00.000Z',
            stats: { backlogCount: 0, totalTodos: 0, activeSprint: null },
          },
        }),
      ),
    );
    renderApp('/projects');

    // The header button (the grid has a "New project" tile too).
    await user.click((await screen.findAllByRole('button', { name: 'New project' }, { timeout: 3000 }))[0]!);
    const form = await screen.findByRole('dialog', { name: 'Create project' });
    await user.type(within(form).getByRole('textbox', { name: /Project name/ }), 'Mobile App');
    await user.type(within(form).getByRole('textbox', { name: 'Description' }), 'An app for field teams');
    await user.click(within(form).getByRole('checkbox', { name: /Generate a starter backlog with AI/ }));
    await user.click(within(form).getByRole('button', { name: 'Create project' }));

    const dialog = await screen.findByRole('dialog', { name: 'Generate todos with AI' }, { timeout: 3000 });
    expect(within(dialog).getByRole('textbox', { name: /Describe the feature/ })).toHaveValue('An app for field teams');
    // Review first: nothing is generated or saved yet.
    expect(generateCalls).toHaveLength(0);
    expect(db.calls.bulk).toHaveLength(0);
  });
});

describe('plan sprint (AI-3)', () => {
  it('suggests a plan within capacity, blocks Create over capacity, then creates the sprint', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Plan sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Plan sprint with AI' });
    const capacity = within(dialog).getByRole('spinbutton', { name: /Capacity/ });
    await user.clear(capacity);
    await user.type(capacity, '20');
    await user.type(within(dialog).getByRole('textbox', { name: /Focus/ }), 'login');
    await user.click(within(dialog).getByRole('button', { name: 'Suggest plan' }));

    expect(await within(dialog).findByRole('textbox', { name: 'Suggested sprint goal' })).toHaveValue('Stabilise login');
    expect(planCalls).toEqual([{ capacity: 20, focus: 'login' }]);
    expect(within(dialog).getByText('2 todos · 5 / 20 pts')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: "AI's reasoning" })).toBeInTheDocument();
    expect(within(dialog).getByText(/Picked 2 todos/)).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: "AI's suggestion" })).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "The AI's notes may not match the plan above — the plan is checked against your backlog and capacity.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/aren't in this plan/)).not.toBeInTheDocument();

    // Candidates: the backlog by priority (urgent, medium, low), the AI's picks checked.
    const rows = within(dialog).getAllByRole('checkbox');
    expect(rows.map((box) => box.closest('label')?.textContent)).toEqual([
      expect.stringContaining('Fix crash on save'),
      expect.stringContaining('Login screen'),
      expect.stringContaining('Sprint summary'),
    ]);
    expect(rows.map((box) => (box as HTMLInputElement).checked)).toEqual([true, true, false]);
    expect(within(dialog).getByText('5 / 20 pts')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create Sprint 5 with 2 todos' })).toBeEnabled();

    // Over capacity: danger message and Create disabled.
    await user.clear(capacity);
    await user.type(capacity, '4');
    expect(within(dialog).getByText('5 / 4 pts')).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Over capacity by 1 pts');
    expect(within(dialog).getByRole('button', { name: 'Create Sprint 5 with 2 todos' })).toBeDisabled();

    // Unchecking a todo brings it back under.
    await user.click(rows[1]!);
    expect(within(dialog).getByText('2 / 4 pts')).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    const goal = within(dialog).getByRole('textbox', { name: 'Suggested sprint goal' });
    await user.clear(goal);
    await user.type(goal, 'Fix the crash');

    await user.click(within(dialog).getByRole('button', { name: 'Create Sprint 5 with 1 todo' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Plan sprint with AI' })).not.toBeInTheDocument();
    });
    expect(db.calls.createSprint).toEqual([{ name: 'Sprint 5', goal: 'Fix the crash', todoIds: ['t3'] }]);
    expect(await screen.findByText('Sprint 5 created with 1 todo')).toBeInTheDocument();
    // The planned sprint shows on the backlog with its todo.
    expect(await screen.findByRole('button', { name: 'Toggle Sprint 5' })).toBeInTheDocument();
  });

  it('shows the picks as the fact when the reasoning names todos outside the backlog', async () => {
    const user = userEvent.setup();
    start();
    server.use(
      http.post(apiUrl('/projects/:projectId/ai/plan-sprint'), () =>
        // KAN-28 is in Sprint 3: the server dropped it from todoIds and recomputed the total, but
        // the model's text still names it and its points.
        HttpResponse.json({
          goal: 'Ship the board',
          todoIds: ['t3', 't4'],
          totalPoints: 2,
          reasoning: 'Picked KAN-28 [id:t1] and KAN-32 [id:t3] for 7 points.',
          source: 'ai',
        }),
      ),
    );
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Plan sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Plan sprint with AI' });
    await user.click(within(dialog).getByRole('button', { name: 'Suggest plan' }));

    expect(await within(dialog).findByText('2 todos · 2 / 20 pts')).toBeInTheDocument();
    expect(within(dialog).getByText('Picked KAN-28 and KAN-32 for 7 points.')).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('[id:');
    expect(within(dialog).getByText("Some todos the AI mentioned aren't in this plan.")).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create Sprint 5 with 2 todos' })).toBeEnabled();
  });

  it('notes a backlog todo the reasoning claims but that was not picked', async () => {
    const user = userEvent.setup();
    start();
    server.use(
      http.post(apiUrl('/projects/:projectId/ai/plan-sprint'), () =>
        // KAN-31 is in the backlog, but only KAN-32 was picked.
        HttpResponse.json({
          goal: 'Fix the crash',
          todoIds: ['t3'],
          totalPoints: 2,
          reasoning: 'Added KAN-31 and KAN-32, exactly 5 points.',
          source: 'ai',
        }),
      ),
    );
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Plan sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Plan sprint with AI' });
    await user.click(within(dialog).getByRole('button', { name: 'Suggest plan' }));

    expect(await within(dialog).findByText('1 todo · 2 / 20 pts')).toBeInTheDocument();
    expect(within(dialog).getByText("Some todos the AI mentioned aren't in this plan.")).toBeInTheDocument();
    const login = within(dialog).getByRole('checkbox', { name: /Login screen/ });
    expect(login).not.toBeChecked();
  });

  it('keeps the over-capacity message pinned above the footer, outside the scrolling body', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Plan sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Plan sprint with AI' });
    const capacity = within(dialog).getByRole('spinbutton', { name: /Capacity/ });
    await user.click(within(dialog).getByRole('button', { name: 'Suggest plan' }));
    await within(dialog).findByText('2 todos · 5 / 20 pts');
    await user.clear(capacity);
    await user.type(capacity, '3');

    const alert = within(dialog).getByRole('alert');
    expect(alert).toHaveTextContent('Over capacity by 2 pts');
    // Not inside the body that scrolls (the footer's sibling), so it is always in view.
    const footer = within(dialog).getByRole('button', { name: /^Create Sprint 5/ }).closest('footer');
    expect(alert.parentElement?.nextElementSibling).toBe(footer);
  });

  it('shows the empty-backlog state', async () => {
    const user = userEvent.setup();
    start(makeTodoDb([], [SPRINT_3, SPRINT_4]));
    renderApp('/projects/p1/backlog');

    await user.click(await screen.findByRole('button', { name: 'Plan sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Plan sprint with AI' });
    expect(await within(dialog).findByRole('heading', { name: 'Your backlog is empty' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Suggest plan' })).toBeDisabled();
  });
});

describe('sprint summary (AI-4)', () => {
  it('shows the saved summary with its time and regenerates it', async () => {
    const user = userEvent.setup();
    start(makeTodoDb(undefined, [SPRINT_3, SPRINT_4, COMPLETED]));
    renderApp('/projects/p1/sprints/s2');

    const card = await screen.findByRole('region', { name: 'AI summary' }, { timeout: 3000 });
    expect(await within(card).findByRole('heading', { name: 'Highlights' })).toBeInTheDocument();
    expect(within(card).getByText('login').tagName).toBe('STRONG');
    expect(card).not.toHaveTextContent('[id:');
    expect(await within(card).findByRole('link', { name: 'KAN-31' })).toHaveAttribute('href', '?todo=t2');
    const generated = card.querySelector('time');
    expect(generated).toHaveAttribute('dateTime', '2026-11-01T17:05:00.000Z');
    // "Nov 1, 2026, 7:05 PM · 3 days ago": date, time and the relative part.
    expect(generated?.textContent).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s?[AP]M · (just now|\d+ (min|hours?|days?) ago)$/);

    await user.click(within(card).getByRole('button', { name: 'Regenerate' }));
    expect(await within(card).findByRole('heading', { name: 'Sprint 2 summary' })).toBeInTheDocument();
    expect(card.querySelector('time')).toHaveAttribute('dateTime', '2026-11-04T10:00:00.000Z');
    expect(summaryCalls).toEqual(['s2']);
    await expectNoAxeViolations(card);
  });

  it('summarizes the active sprint from the board header, in a dialog', async () => {
    const user = userEvent.setup();
    start();
    renderApp('/projects/p1/board');

    const summarize = await screen.findByRole('button', { name: 'Summarize' }, { timeout: 3000 });
    expect(screen.queryByRole('region', { name: /summary/ })).not.toBeInTheDocument();
    // No saved summary: one click opens the dialog and starts writing it.
    await user.click(summarize);
    const dialog = await screen.findByRole('dialog', { name: 'Sprint 3 · AI summary' });
    const card = await within(dialog).findByRole('region', { name: /^Mid-sprint summary · Day \d+ of 14$/ });
    expect(card).toHaveTextContent(/0 of 1 todos done · 0 of 5 pts done/);
    expect(await within(card).findByRole('heading', { name: 'Sprint 3 summary' })).toBeInTheDocument();
    expect(summaryCalls).toEqual(['s3']);
    expect(within(card).getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
    expect(within(card).getByText(/AI can make mistakes/)).toBeInTheDocument();

    // Saved now: the header button shows it without asking again.
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Sprint 3 · AI summary' })).not.toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'View summary' }));
    expect(await screen.findByRole('heading', { name: 'Sprint 3 summary' })).toBeInTheDocument();
    expect(summaryCalls).toEqual(['s3']);
  });

  it('completes the sprint even when the requested summary fails, and offers Try again', async () => {
    const user = userEvent.setup();
    start();
    let fail = true;
    server.use(
      http.post(apiUrl('/sprints/:sprintId/ai/summary'), ({ params }) => {
        summaryCalls.push(String(params.sprintId));
        if (fail) {
          fail = false;
          return HttpResponse.json(errorBody('AI_ERROR', 'The AI provider is down.'), { status: 502 });
        }
        const sprint = db.sprints.find((item) => item.id === params.sprintId)!;
        const summary = { content: '## Recovered summary', source: 'mock' as const, generatedAt: '2026-11-04T10:00:00.000Z' };
        sprint.summary = summary;
        return HttpResponse.json({ sprint, summary });
      }),
    );
    renderApp('/projects/p1/board');

    await user.click(await screen.findByRole('button', { name: 'Complete sprint' }, { timeout: 3000 }));
    const dialog = await screen.findByRole('dialog', { name: 'Complete Sprint 3' });
    await user.click(within(dialog).getByRole('checkbox', { name: /Generate AI summary/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Complete sprint' }));

    // Completed first, then the summary is asked for.
    await waitFor(() => {
      expect(summaryCalls).toEqual(['s3']);
    });
    expect(db.calls.completeSprint).toEqual([{ sprintId: 's3', body: { moveUnfinishedTo: 'backlog' } }]);
    expect(db.sprints.find((sprint) => sprint.id === 's3')?.status).toBe('completed');
    expect(
      await screen.findByText('Sprint 3 is completed, but its AI summary failed. The AI provider is down.'),
    ).toBeInTheDocument();

    const card = await screen.findByRole('region', { name: 'AI summary' }, { timeout: 3000 });
    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('The AI provider is down.');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await within(card).findByRole('heading', { name: 'Recovered summary' })).toBeInTheDocument();
    expect(db.sprints.find((sprint) => sprint.id === 's3')?.status).toBe('completed');
  });
});
