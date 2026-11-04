import { http, HttpResponse } from 'msw';
import {
  TODO_STATUSES,
  type CompleteSprintRequest,
  type CreateSprintRequest,
  type CreateTodoRequest,
  type MoveTodoRequest,
  type Sprint,
  type StartSprintRequest,
  type Todo,
  type UpdateSprintRequest,
  type UpdateTodoRequest,
} from '@/types/api';
import { errorBody } from './renderApp';
import { apiUrl } from './server';

const STATS = { totalTodos: 0, doneTodos: 0, totalPoints: 0, donePoints: 0, byStatus: { todo: 0, in_progress: 0, in_review: 0, done: 0 } };

/** A `Todo` with test defaults (project p1, backlog, task, medium, no points). */
export function makeTodo(overrides: Partial<Todo> & Pick<Todo, 'id' | 'key' | 'title'>): Todo {
  return {
    projectId: 'p1',
    sprintId: null,
    description: '',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    storyPoints: null,
    labels: [],
    dueDate: null,
    order: 0,
    createdAt: '2026-11-02T09:00:00.000Z',
    updatedAt: '2026-11-02T09:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

export function makeSprint(overrides: Partial<Sprint> & Pick<Sprint, 'id' | 'name' | 'status'>): Sprint {
  return {
    projectId: 'p1',
    goal: '',
    startDate: null,
    endDate: null,
    startedAt: null,
    completedAt: null,
    completedStats: null,
    summary: null,
    stats: STATS,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    ...overrides,
  };
}

export const SPRINT_3 = makeSprint({
  id: 's3',
  name: 'Sprint 3',
  status: 'active',
  startDate: '2026-11-02',
  endDate: '2026-11-15',
});
export const SPRINT_4 = makeSprint({ id: 's4', name: 'Sprint 4', status: 'planned' });

/** One todo in the active sprint, three in the backlog (10 points in all). */
export function seedTodos(): Todo[] {
  return [
    makeTodo({
      id: 't1',
      key: 'KAN-28',
      title: 'Drag and drop on the board',
      sprintId: 's3',
      type: 'story',
      status: 'in_progress',
      priority: 'high',
      storyPoints: 5,
      labels: ['frontend'],
    }),
    makeTodo({
      id: 't2',
      key: 'KAN-31',
      title: 'Login screen',
      storyPoints: 3,
      labels: ['auth', 'frontend', 'forms'],
      order: 0,
    }),
    makeTodo({
      id: 't3',
      key: 'KAN-32',
      title: 'Fix crash on save',
      description: 'Saving a todo crashes the app',
      type: 'bug',
      priority: 'urgent',
      storyPoints: 2,
      order: 1,
    }),
    makeTodo({ id: 't4', key: 'KAN-33', title: 'Sprint summary', type: 'story', priority: 'low', order: 2 }),
  ];
}

export interface TodoDb {
  todos: Todo[];
  sprints: Sprint[];
  /** Requests seen, by handler name, so tests can check what was (not) sent. */
  calls: {
    list: number;
    get: number;
    create: CreateTodoRequest[];
    update: UpdateTodoRequest[];
    remove: string[];
    move: { todoId: string; body: MoveTodoRequest }[];
    createSprint: CreateSprintRequest[];
    updateSprint: { sprintId: string; body: UpdateSprintRequest }[];
    deleteSprint: string[];
    startSprint: { sprintId: string; body: StartSprintRequest }[];
    completeSprint: { sprintId: string; body: CompleteSprintRequest }[];
    board: string[];
  };
}

export function makeTodoDb(todos = seedTodos(), sprints = [SPRINT_3, SPRINT_4]): TodoDb {
  // Copies: the handlers mutate what they store, and SPRINT_3 / SPRINT_4 are shared constants.
  return {
    todos: todos.map((todo) => ({ ...todo, labels: [...todo.labels] })),
    sprints: sprints.map((sprint) => ({ ...sprint })),
    calls: {
      list: 0,
      get: 0,
      create: [],
      update: [],
      remove: [],
      move: [],
      createSprint: [],
      updateSprint: [],
      deleteSprint: [],
      startSprint: [],
      completeSprint: [],
      board: [],
    },
  };
}

const STATUS_RANK = Object.fromEntries(TODO_STATUSES.map((status, index) => [status, index])) as Record<string, number>;

/** The server's list sort (todos.routes.ts), written out again so the tests don't trust the client's copy. */
function serverOrder(a: Todo, b: Todo) {
  if (a.sprintId !== b.sprintId) return (a.sprintId ?? '').localeCompare(b.sprintId ?? '');
  return (a.sprintId === null ? 0 : STATUS_RANK[a.status]! - STATUS_RANK[b.status]!) || a.order - b.order;
}

/** The server's `moveTodo` (board.service.ts): lists are the backlog or one status column of a sprint. */
export function serverMove(db: TodoDb, todo: Todo, target: { sprintId: string | null; status: Todo['status']; position: number }) {
  const sameList = (where: Pick<Todo, 'sprintId' | 'status'>) => (item: Todo) =>
    item.id !== todo.id && item.sprintId === where.sprintId && (where.sprintId === null || item.status === where.status);
  const renumber = (list: Todo[]) => {
    list.forEach((item, index) => (item.order = index));
  };
  renumber(db.todos.filter(sameList(todo)).sort((a, b) => a.order - b.order));
  todo.sprintId = target.sprintId;
  todo.status = target.status;
  const to = db.todos.filter(sameList(todo)).sort((a, b) => a.order - b.order);
  to.splice(Math.max(0, Math.min(target.position, to.length)), 0, todo);
  renumber(to);
}

/** The server's `statsFor` (board.service.ts), written out again for the fake. */
export function statsOf(todos: readonly Todo[]): Sprint['stats'] {
  const byStatus = { todo: 0, in_progress: 0, in_review: 0, done: 0 };
  let totalPoints = 0;
  let donePoints = 0;
  for (const todo of todos) {
    byStatus[todo.status] += 1;
    totalPoints += todo.storyPoints ?? 0;
    if (todo.status === 'done') donePoints += todo.storyPoints ?? 0;
  }
  return { totalTodos: todos.length, doneTodos: byStatus.done, totalPoints, donePoints, byStatus };
}

/** A sprint as the server returns it: live stats from the todos in it. */
function withStats(db: TodoDb, sprint: Sprint): Sprint {
  return { ...sprint, stats: statsOf(db.todos.filter((todo) => todo.sprintId === sprint.id)) };
}

/** The todos and sprints endpoints the backlog, board, sprints page and Todo details use, backed by `db`. */
export function todoHandlers(db: TodoDb) {
  let nextNumber = 40;
  const find = (id: unknown) => db.todos.find((todo) => todo.id === id);
  const notFound = () => HttpResponse.json(errorBody('NOT_FOUND', 'Todo not found'), { status: 404 });

  return [
    http.get(apiUrl('/projects/:projectId/todos'), () => {
      db.calls.list += 1;
      return HttpResponse.json({ todos: [...db.todos].sort(serverOrder) });
    }),
    http.get(apiUrl('/projects/:projectId/sprints'), () =>
      HttpResponse.json({ sprints: db.sprints.map((sprint) => withStats(db, sprint)) }),
    ),
    http.get(apiUrl('/sprints/:sprintId/todos'), ({ params }) => {
      const sprint = db.sprints.find((item) => item.id === params.sprintId);
      if (!sprint) return HttpResponse.json(errorBody('NOT_FOUND', 'Sprint not found'), { status: 404 });
      db.calls.board.push(sprint.id);
      const columns = Object.fromEntries(TODO_STATUSES.map((status) => [status, [] as Todo[]])) as Record<Todo['status'], Todo[]>;
      for (const todo of [...db.todos].sort(serverOrder)) if (todo.sprintId === sprint.id) columns[todo.status].push(todo);
      return HttpResponse.json({ sprint: withStats(db, sprint), columns });
    }),
    http.post(apiUrl('/sprints/:sprintId/complete'), async ({ params, request }) => {
      const body = (await request.json()) as CompleteSprintRequest;
      const sprint = db.sprints.find((item) => item.id === params.sprintId);
      if (!sprint) return HttpResponse.json(errorBody('NOT_FOUND', 'Sprint not found'), { status: 404 });
      if (sprint.status !== 'active') {
        return HttpResponse.json(errorBody('CONFLICT', 'Only the active sprint can be completed.'), { status: 409 });
      }
      db.calls.completeSprint.push({ sprintId: sprint.id, body });
      const target = body.moveUnfinishedTo === 'backlog' ? null : body.moveUnfinishedTo;
      const todos = db.todos.filter((todo) => todo.sprintId === sprint.id);
      const unfinished = todos.filter((todo) => todo.status !== 'done');
      sprint.completedStats = { ...statsOf(todos), carriedOver: unfinished.length };
      for (const todo of unfinished) {
        serverMove(db, todo, { sprintId: target, status: todo.status, position: Number.MAX_SAFE_INTEGER });
      }
      Object.assign(sprint, { status: 'completed', completedAt: '2026-11-16T17:00:00.000Z' });
      return HttpResponse.json({ sprint: withStats(db, sprint) });
    }),
    http.get(apiUrl('/todos/:todoId'), ({ params }) => {
      db.calls.get += 1;
      const todo = find(params.todoId);
      return todo ? HttpResponse.json({ todo }) : notFound();
    }),
    http.post(apiUrl('/projects/:projectId/todos'), async ({ request }) => {
      const body = (await request.json()) as CreateTodoRequest;
      db.calls.create.push(body);
      const sprintId = body.sprintId ?? null;
      const status = body.status ?? 'todo';
      // New todos go to the end of their list (the backlog, or one status column of a sprint).
      const order = db.todos.filter((item) => item.sprintId === sprintId && (sprintId === null || item.status === status)).length;
      const todo = makeTodo({ id: `new-${nextNumber}`, key: `KAN-${nextNumber}`, title: body.title, sprintId, status, order });
      nextNumber += 1;
      db.todos.push(todo);
      return HttpResponse.json({ todo }, { status: 201 });
    }),
    http.patch(apiUrl('/todos/:todoId'), async ({ params, request }) => {
      const body = (await request.json()) as UpdateTodoRequest;
      db.calls.update.push(body);
      const todo = find(params.todoId);
      if (!todo) return notFound();
      Object.assign(todo, body);
      return HttpResponse.json({ todo });
    }),
    http.post(apiUrl('/todos/:todoId/move'), async ({ params, request }) => {
      const body = (await request.json()) as MoveTodoRequest;
      const todo = find(params.todoId);
      if (!todo) return notFound();
      db.calls.move.push({ todoId: todo.id, body });
      serverMove(db, todo, {
        sprintId: body.sprintId === undefined ? todo.sprintId : body.sprintId,
        status: body.status ?? todo.status,
        position: body.position,
      });
      return HttpResponse.json({ todo });
    }),
    http.post(apiUrl('/projects/:projectId/sprints'), async ({ request }) => {
      const body = (await request.json()) as CreateSprintRequest;
      db.calls.createSprint.push(body);
      const sprint = makeSprint({
        id: `sprint-${db.sprints.length + 1}`,
        name: body.name ?? `Sprint ${db.sprints.length + 1}`,
        status: 'planned',
        goal: body.goal ?? '',
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
      });
      db.sprints.push(sprint);
      return HttpResponse.json({ sprint }, { status: 201 });
    }),
    http.patch(apiUrl('/sprints/:sprintId'), async ({ params, request }) => {
      const body = (await request.json()) as UpdateSprintRequest;
      const sprint = db.sprints.find((item) => item.id === params.sprintId);
      if (!sprint) return HttpResponse.json(errorBody('NOT_FOUND', 'Sprint not found'), { status: 404 });
      db.calls.updateSprint.push({ sprintId: sprint.id, body });
      Object.assign(sprint, body);
      return HttpResponse.json({ sprint });
    }),
    http.delete(apiUrl('/sprints/:sprintId'), ({ params }) => {
      const sprint = db.sprints.find((item) => item.id === params.sprintId);
      if (!sprint) return HttpResponse.json(errorBody('NOT_FOUND', 'Sprint not found'), { status: 404 });
      if (sprint.status !== 'planned') {
        return HttpResponse.json(errorBody('CONFLICT', 'Only planned sprints can be deleted.'), { status: 409 });
      }
      db.calls.deleteSprint.push(sprint.id);
      for (const todo of db.todos.filter((item) => item.sprintId === sprint.id)) {
        serverMove(db, todo, { sprintId: null, status: todo.status, position: Number.MAX_SAFE_INTEGER });
      }
      db.sprints = db.sprints.filter((item) => item !== sprint);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(apiUrl('/sprints/:sprintId/start'), async ({ params, request }) => {
      const body = (await request.json()) as StartSprintRequest;
      const sprint = db.sprints.find((item) => item.id === params.sprintId);
      if (!sprint) return HttpResponse.json(errorBody('NOT_FOUND', 'Sprint not found'), { status: 404 });
      const active = db.sprints.find((item) => item.status === 'active');
      if (active) {
        return HttpResponse.json(
          errorBody('CONFLICT', `"${active.name}" is still active. Complete it before starting another sprint.`),
          { status: 409 },
        );
      }
      db.calls.startSprint.push({ sprintId: sprint.id, body });
      Object.assign(sprint, { status: 'active', startDate: body.startDate ?? null, endDate: body.endDate ?? null });
      return HttpResponse.json({ sprint });
    }),
    http.delete(apiUrl('/todos/:todoId'), ({ params }) => {
      const todo = find(params.todoId);
      if (!todo) return notFound();
      db.calls.remove.push(todo.id);
      db.todos = db.todos.filter((item) => item !== todo);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
