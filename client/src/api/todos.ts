import type {
  BulkCreateTodosRequest,
  BulkCreateTodosResponse,
  CreateTodoRequest,
  MoveTodoRequest,
  Todo,
  TodoListQuery,
  TodoListResponse,
  UpdateTodoRequest,
} from '@/types/api';
import { request } from './client';

interface TodoResponse {
  todo: Todo;
}

/** Sorted by `order` within each list. */
export async function listTodos(
  projectId: string,
  query: TodoListQuery = {},
  signal?: AbortSignal,
): Promise<Todo[]> {
  const { todos } = await request<TodoListResponse>('GET', `/projects/${projectId}/todos`, {
    query: { ...query },
    signal,
  });
  return todos;
}

export async function getTodo(todoId: string, signal?: AbortSignal): Promise<Todo> {
  const { todo } = await request<TodoResponse>('GET', `/todos/${todoId}`, { signal });
  return todo;
}

export async function createTodo(projectId: string, body: CreateTodoRequest): Promise<Todo> {
  const { todo } = await request<TodoResponse>('POST', `/projects/${projectId}/todos`, { body });
  return todo;
}

export async function bulkCreateTodos(
  projectId: string,
  body: BulkCreateTodosRequest,
): Promise<Todo[]> {
  const { todos } = await request<BulkCreateTodosResponse>(
    'POST',
    `/projects/${projectId}/todos/bulk`,
    { body },
  );
  return todos;
}

export async function updateTodo(todoId: string, body: UpdateTodoRequest): Promise<Todo> {
  const { todo } = await request<TodoResponse>('PATCH', `/todos/${todoId}`, { body });
  return todo;
}

/** `position` = index in the target list after removing the todo (plan §3.5). */
export async function moveTodo(todoId: string, body: MoveTodoRequest): Promise<Todo> {
  const { todo } = await request<TodoResponse>('POST', `/todos/${todoId}/move`, { body });
  return todo;
}

export function deleteTodo(todoId: string): Promise<void> {
  return request<undefined>('DELETE', `/todos/${todoId}`);
}
