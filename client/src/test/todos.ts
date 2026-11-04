import { http, HttpResponse } from 'msw';
import type { CreateTodoRequest, Sprint, Todo, UpdateTodoRequest } from '@/types/api';
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
  calls: { list: number; get: number; create: CreateTodoRequest[]; update: UpdateTodoRequest[]; remove: string[] };
}

export function makeTodoDb(todos = seedTodos(), sprints = [SPRINT_3, SPRINT_4]): TodoDb {
  return { todos, sprints, calls: { list: 0, get: 0, create: [], update: [], remove: [] } };
}

/** The todos and sprints endpoints the backlog and Todo details use, backed by `db`. */
export function todoHandlers(db: TodoDb) {
  let nextNumber = 40;
  const find = (id: unknown) => db.todos.find((todo) => todo.id === id);
  const notFound = () => HttpResponse.json(errorBody('NOT_FOUND', 'Todo not found'), { status: 404 });

  return [
    http.get(apiUrl('/projects/:projectId/todos'), () => {
      db.calls.list += 1;
      return HttpResponse.json({ todos: db.todos });
    }),
    http.get(apiUrl('/projects/:projectId/sprints'), () => HttpResponse.json({ sprints: db.sprints })),
    http.get(apiUrl('/todos/:todoId'), ({ params }) => {
      db.calls.get += 1;
      const todo = find(params.todoId);
      return todo ? HttpResponse.json({ todo }) : notFound();
    }),
    http.post(apiUrl('/projects/:projectId/todos'), async ({ request }) => {
      const body = (await request.json()) as CreateTodoRequest;
      db.calls.create.push(body);
      const todo = makeTodo({ id: `new-${nextNumber}`, key: `KAN-${nextNumber}`, title: body.title, order: db.todos.length });
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
    http.delete(apiUrl('/todos/:todoId'), ({ params }) => {
      const todo = find(params.todoId);
      if (!todo) return notFound();
      db.calls.remove.push(todo.id);
      db.todos = db.todos.filter((item) => item !== todo);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
