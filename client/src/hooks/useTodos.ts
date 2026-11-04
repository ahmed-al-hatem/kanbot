import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createTodo, deleteTodo, getTodo, listTodos, updateTodo } from '@/api/todos';
import { queryClient } from '@/app/queryClient';
import type { CreateTodoRequest, Todo, UpdateTodoRequest } from '@/types/api';
import { qk } from './queryKeys';

/**
 * Every todo of a project in one request (plan §5.3): the backlog splits it by `sprintId`
 * client-side, and filters run over it locally, so typing a search sends nothing.
 */
export function todosQuery(projectId: string) {
  return queryOptions({
    queryKey: qk.todos(projectId, {}),
    queryFn: ({ signal }) => listTodos(projectId, {}, signal),
  });
}

/** `GET /projects/:id/todos`, optionally reshaped with a stable `select`. */
export function useProjectTodos<T = Todo[]>(projectId: string, select?: (todos: Todo[]) => T) {
  return useQuery({ ...todosQuery(projectId), select });
}

const TEMP_PREFIX = 'temp-';
let tempCounter = 0;

/** Optimistic rows from quick create carry a temporary id until the server answers (plan §9.2). */
export function isTempTodo(todoId: string) {
  return todoId.startsWith(TEMP_PREFIX);
}

/** The todo from any cached todo list of any project, with when that list was fetched. */
function findCachedTodo(todoId: string): { todo: Todo; updatedAt: number } | undefined {
  for (const [queryKey, list] of queryClient.getQueriesData<Todo[]>({ queryKey: ['todos'] })) {
    const todo = list?.find((item) => item.id === todoId);
    if (todo) return { todo, updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0 };
  }
  return undefined;
}

/**
 * `GET /todos/:id` (BL-3). Seeded from the list cache, so a click paints the dialog at once;
 * a deep link (`?todo=<id>` on a cold page) fetches it.
 */
export function useTodo(todoId: string) {
  return useQuery({
    queryKey: qk.todo(todoId),
    queryFn: ({ signal }) => getTodo(todoId, signal),
    initialData: () => findCachedTodo(todoId)?.todo,
    initialDataUpdatedAt: () => findCachedTodo(todoId)?.updatedAt,
    enabled: !isTempTodo(todoId),
  });
}

/** Plan §5.1: a todo change touches the lists, the project stats and the sprint stats/board. */
function invalidateAfterTodoChange(projectId: string, sprintIds: (string | null)[]) {
  void queryClient.invalidateQueries({ queryKey: qk.todos(projectId) });
  void queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
  void queryClient.invalidateQueries({ queryKey: qk.projects });
  if (sprintIds.some(Boolean)) void queryClient.invalidateQueries({ queryKey: qk.sprints(projectId) });
  for (const sprintId of new Set(sprintIds)) {
    if (sprintId) void queryClient.invalidateQueries({ queryKey: qk.board(sprintId) });
  }
}

function replaceInLists(projectId: string, id: string, next: Todo | null) {
  queryClient.setQueriesData<Todo[]>({ queryKey: qk.todos(projectId) }, (list) =>
    next ? list?.map((item) => (item.id === id ? next : item)) : list?.filter((item) => item.id !== id),
  );
}

/** Quick-create POSTs run one after another per project, so todos land in the order typed. */
const createQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(projectId: string, run: () => Promise<T>): Promise<T> {
  const next = (createQueues.get(projectId) ?? Promise.resolve()).catch(() => undefined).then(run);
  createQueues.set(projectId, next);
  return next;
}

interface CreateVariables {
  body: CreateTodoRequest;
  tempId: string;
}

interface CreateHandlers {
  /** The server's todo replaced the temporary row. */
  onCreated?: (todo: Todo) => void;
  /** The temporary row was removed again. */
  onFailed?: (error: Error, title: string) => void;
}

/**
 * `POST /projects/:id/todos` (BL-2), optimistic: the row shows at once with a temporary id,
 * then takes the server's todo. The requests are queued (not the optimistic rows), so several
 * todos can be typed in a row; the lists refetch once the last one settles.
 */
export function useCreateTodo(projectId: string, { onCreated, onFailed }: CreateHandlers = {}) {
  const listKey = qk.todos(projectId, {});
  const mutationKey = ['create-todo', projectId] as const;
  const mutation = useMutation({
    mutationKey,
    mutationFn: ({ body }: CreateVariables) => enqueue(projectId, () => createTodo(projectId, body)),
    onMutate: async ({ body, tempId }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const now = new Date().toISOString();
      const temp: Todo = {
        id: tempId,
        projectId,
        sprintId: body.sprintId ?? null,
        key: '',
        title: body.title,
        description: '',
        type: body.type ?? 'task',
        status: 'todo',
        priority: body.priority ?? 'medium',
        storyPoints: body.storyPoints ?? null,
        labels: [],
        dueDate: null,
        order: Number.MAX_SAFE_INTEGER,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      };
      queryClient.setQueryData<Todo[]>(listKey, (list) => (list ? [...list, temp] : list));
    },
    // Hook-level callbacks: per-call ones only fire for the latest `mutate` (TanStack v5).
    onSuccess: (todo, { tempId }) => {
      replaceInLists(projectId, tempId, todo);
      onCreated?.(todo);
    },
    onError: (error, { body, tempId }) => {
      replaceInLists(projectId, tempId, null);
      onFailed?.(error, body.title);
    },
    onSettled: () => {
      // Still counted while settling: 1 means no other create is waiting (plan §9.2).
      if (queryClient.isMutating({ mutationKey }) === 1) invalidateAfterTodoChange(projectId, []);
    },
  });

  return {
    ...mutation,
    /** Creates with the BL-2 defaults (task, medium, no points); returns the temporary id. */
    create: (title: string) => {
      tempCounter += 1;
      const tempId = `${TEMP_PREFIX}${tempCounter}`;
      mutation.mutate({ body: { title }, tempId });
      return tempId;
    },
  };
}

/** `PATCH /todos/:id` (BL-3). Puts the saved todo in the caches, then refetches (plan §5.1). */
export function useUpdateTodo() {
  return useMutation({
    mutationFn: ({ todo, body }: { todo: Todo; body: UpdateTodoRequest }) => updateTodo(todo.id, body),
    onSuccess: (saved, { todo }) => {
      queryClient.setQueryData(qk.todo(saved.id), saved);
      replaceInLists(saved.projectId, saved.id, saved);
      invalidateAfterTodoChange(saved.projectId, [todo.sprintId, saved.sprintId]);
    },
  });
}

interface DeleteContext {
  previous: [readonly unknown[], Todo[] | undefined][];
}

interface DeleteHandlers {
  onDeleted?: (todo: Todo) => void;
  /** The todo is already back in the lists. */
  onFailed?: (error: Error, todo: Todo) => void;
}

/**
 * `DELETE /todos/:id` (BL-4), optimistic (plan §10 decision 2): the row goes as soon as the
 * user confirms and comes back if the request fails. The caller shows the toasts.
 */
export function useDeleteTodo({ onDeleted, onFailed }: DeleteHandlers = {}) {
  return useMutation({
    mutationFn: (todo: Todo) => deleteTodo(todo.id),
    onMutate: async (todo): Promise<DeleteContext> => {
      const lists = qk.todos(todo.projectId);
      await queryClient.cancelQueries({ queryKey: lists });
      const previous = queryClient.getQueriesData<Todo[]>({ queryKey: lists });
      replaceInLists(todo.projectId, todo.id, null);
      return { previous };
    },
    onError: (error, todo, context) => {
      for (const [queryKey, list] of context?.previous ?? []) queryClient.setQueryData(queryKey, list);
      onFailed?.(error, todo);
    },
    onSuccess: (_data, todo) => {
      queryClient.removeQueries({ queryKey: qk.todo(todo.id) });
      onDeleted?.(todo);
    },
    onSettled: (_data, _error, todo) => {
      invalidateAfterTodoChange(todo.projectId, [todo.sprintId]);
    },
  });
}
