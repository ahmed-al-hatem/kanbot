import { randomUUID } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import type {
  AiStatusResponse,
  AuthResponse,
  BulkCreateTodosResponse,
  CreateSprintRequest,
  CreateTodoRequest,
  MoveTodoRequest,
  ProjectWithStats,
  Sprint,
  SprintSummaryResponse,
  Todo,
} from '../src/types/api';

/** Same key and shape as `stores/session.ts` (zustand `persist`, version 0). */
const TOKEN_KEY = 'kanbot.token';

export interface Credentials {
  name: string;
  email: string;
  password: string;
}

/** A user nobody has registered yet: every test gets its own, so runs never collide or need a seed. */
export function newUser(): Credentials {
  const id = randomUUID().slice(0, 8);
  return { name: `E2E ${id}`, email: `e2e-${id}-${Date.now()}@kanbot.test`, password: 'password123' };
}

/** A thin API client for test setup, through the preview's `/api` proxy (same origin as the app). */
export class Api {
  // Plain fields, not parameter properties: `erasableSyntaxOnly` forbids those.
  private readonly request: APIRequestContext;
  readonly token: string;

  constructor(request: APIRequestContext, token: string) {
    this.request = request;
    this.token = token;
  }

  private async call<T>(method: 'GET' | 'POST', path: string, data?: unknown): Promise<T> {
    const response = await this.request.fetch(`/api${path}`, {
      method,
      data,
      headers: { Authorization: `Bearer ${this.token}` },
    });
    expect(response.ok(), `${method} ${path} → ${response.status()} ${await response.text()}`).toBe(true);
    return (await response.json()) as T;
  }

  async project(name: string): Promise<ProjectWithStats> {
    return (await this.call<{ project: ProjectWithStats }>('POST', '/projects', { name })).project;
  }

  async todos(projectId: string, todos: CreateTodoRequest[]): Promise<Todo[]> {
    return (await this.call<BulkCreateTodosResponse>('POST', `/projects/${projectId}/todos/bulk`, { todos })).todos;
  }

  async sprint(projectId: string, body: CreateSprintRequest): Promise<Sprint> {
    return (await this.call<{ sprint: Sprint }>('POST', `/projects/${projectId}/sprints`, body)).sprint;
  }

  async move(todoId: string, body: MoveTodoRequest): Promise<Todo> {
    return (await this.call<{ todo: Todo }>('POST', `/todos/${todoId}/move`, body)).todo;
  }

  async start(sprintId: string): Promise<Sprint> {
    return (await this.call<{ sprint: Sprint }>('POST', `/sprints/${sprintId}/start`, {})).sprint;
  }

  async complete(sprintId: string): Promise<Sprint> {
    return (await this.call<{ sprint: Sprint }>('POST', `/sprints/${sprintId}/complete`, { moveUnfinishedTo: 'backlog' }))
      .sprint;
  }

  async summarize(sprintId: string): Promise<SprintSummaryResponse> {
    return this.call<SprintSummaryResponse>('POST', `/sprints/${sprintId}/ai/summary`);
  }

  async aiMode(): Promise<AiStatusResponse['mode']> {
    return (await this.call<AiStatusResponse>('GET', '/ai/status')).mode;
  }
}

/** Registers a fresh user over the API (no UI) and returns an API client with its token. */
export async function registerViaApi(request: APIRequestContext, user = newUser()) {
  const response = await request.post('/api/auth/register', { data: user });
  expect(response.ok(), `register → ${response.status()} ${await response.text()}`).toBe(true);
  const auth = (await response.json()) as AuthResponse;
  return { user, api: new Api(request, auth.token) };
}

/** Saves the token the way the session store does, then opens `path` signed in. */
export async function openSignedIn(page: Page, token: string, path: string) {
  await page.goto('/login');
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [TOKEN_KEY, JSON.stringify({ state: { token }, version: 0 })] as const,
  );
  await page.goto(path);
}

/** Reads the token the app persisted (after a sign-up or log in through the UI). */
export async function storedToken(page: Page): Promise<string> {
  const raw = await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY);
  const token = raw ? (JSON.parse(raw) as { state?: { token?: string | null } }).state?.token : null;
  expect(token, 'token in localStorage').toBeTruthy();
  return token ?? '';
}

export function removeToken(page: Page) {
  return page.evaluate((key) => {
    localStorage.removeItem(key);
  }, TOKEN_KEY);
}

/** A project with estimated backlog todos, ready for the board tests. */
export const SAMPLE_TODOS: CreateTodoRequest[] = [
  { title: 'Set up the router', type: 'task', priority: 'high', storyPoints: 3 },
  { title: 'Login form', type: 'story', priority: 'medium', storyPoints: 5, labels: ['auth'] },
  { title: 'Fix avatar upload', type: 'bug', priority: 'urgent', storyPoints: 2 },
];

/** A project whose sprint is active with the sample todos: the board is ready. */
export async function projectWithActiveSprint(api: Api, name = 'E2E Board') {
  const project = await api.project(name);
  const todos = await api.todos(project.id, SAMPLE_TODOS);
  const sprint = await api.sprint(project.id, { name: 'Sprint 1', goal: 'Ship the basics', todoIds: todos.map((t) => t.id) });
  await api.start(sprint.id);
  return { project, todos, sprint };
}

export const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A board column by its name ("To Do", "In Progress"…); its accessible name ends with the count. */
export const column = (page: Page, name: string) =>
  page.getByRole('region', { name: new RegExp(`^${escapeRegExp(name)}, \\d+ todos?$`) });

/** A board card: its button's name starts with the todo title. */
export const card = (scope: Page | Locator, title: string) =>
  scope.getByRole('button', { name: new RegExp(`^${escapeRegExp(title)}`) });

/** Resolves with the next `POST /todos/:id/move` response. */
export const nextMove = (page: Page) =>
  page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/todos\/[^/]+\/move$/.test(r.url()));

/**
 * A real pointer drag (dnd-kit's mouse sensor needs ≥ 4px of travel before it picks the item up),
 * moving in small steps so the collision detection sees every droppable on the way.
 */
export async function pointerDrag(page: Page, source: Locator, target: Locator, at: 'center' | 'top' = 'center') {
  await source.scrollIntoViewIfNeeded();
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('pointerDrag: source or target is not visible');
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  const endX = to.x + to.width / 2;
  const endY = at === 'top' ? to.y + 2 : to.y + Math.min(to.height / 2, 120);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 8, startY + 8, { steps: 4 });
  await page.mouse.move(endX, endY, { steps: 24 });
  // A last small move lets the sortable preview settle on the final position before the drop.
  await page.mouse.move(endX, endY + 1, { steps: 2 });
  await page.mouse.up();
}

/** WCAG 2.1 A + AA rules, `color-contrast` included (DESIGN §15: no axe errors in either theme). */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Soft, so one run reports every page's violations instead of stopping at the first page.
 * One readable line per failing node, so a failure can be pasted back as is.
 */
export async function expectNoA11yViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const report = violations.flatMap((v) =>
    v.nodes.map(
      (node) => `${v.id} (${v.impact ?? 'n/a'}): ${node.target.join(' ')} — ${node.failureSummary ?? v.help}`,
    ),
  );
  expect.soft(report, `axe violations on ${where}`).toEqual([]);
}
