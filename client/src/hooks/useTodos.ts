import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { bulkCreateTodos, createTodo, deleteTodo, getTodo, listTodos, updateTodo } from '@/api/todos';
import { queryClient } from '@/app/queryClient';
import type { CreateTodoRequest, Todo, TodoStatus, UpdateTodoRequest } from '@/types/api';
import { qk } from './queryKeys';
import { findBoardTodo, updateCachedBoards } from './useBoard';

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

/** The todo from any cached todo list or board, with when that list was fetched. */
function findCachedTodo(todoId: string): { todo: Todo; updatedAt: number } | undefined {
  for (const [queryKey, list] of queryClient.getQueriesData<Todo[]>({ queryKey: ['todos'] })) {
    const todo = list?.find((item) => item.id === todoId);
    if (todo) return { todo, updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0 };
  }
  return findBoardTodo(todoId);
}

/**
 * `GET /todos/:id` (BL-3). Seeded from the list cache, so a click paints the dialog at once;
 * a deep link (`?todo=<id>` on a cold page) fetches it. `null` (no `?todo=`) fetches nothing.
 */
export function useTodo(todoId: string | null) {
  const id = todoId ?? '';
  return useQuery({
    queryKey: qk.todo(id),
    queryFn: ({ signal }) => getTodo(id, signal),
    initialData: () => (id ? findCachedTodo(id)?.todo : undefined),
    initialDataUpdatedAt: () => (id ? findCachedTodo(id)?.updatedAt : undefined),
    enabled: Boolean(id) && !isTempTodo(id),
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

/**
 * Replaces (or, with `null`, removes) a todo in every cached todo list of the project and in
 * every cached board. A board rebuilds its columns, so a todo whose status or sprint changed
 * lands in the right column (or leaves the board) at once.
 */
function replaceInLists(projectId: string, id: string, next: Todo | null) {
  queryClient.setQueriesData<Todo[]>({ queryKey: qk.todos(projectId) }, (list) =>
    next ? list?.map((item) => (item.id === id ? next : item)) : list?.filter((item) => item.id !== id),
  );
  updateCachedBoards((todos) => {
    if (!todos.some((item) => item.id === id)) return todos;
    return next ? todos.map((item) => (item.id === id ? next : item)) : todos.filter((item) => item.id !== id);
  });
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

/** Where a new todo goes: the backlog by default, or a sprint and a board column. */
export interface CreatePlace {
  sprintId: string;
  status: TodoStatus;
}

interface CreateHandlers {
  /** The server's todo replaced the temporary row. */
  onCreated?: (todo: Todo) => void;
  /** The temporary row was removed again. */
  onFailed?: (error: Error, title: string) => void;
}

/**
 * `POST /projects/:id/todos` (BL-2, the board's column composer), optimistic: the row or card
 * shows at once with a temporary id — at the end of the backlog, or of its board column — then
 * takes the server's todo. The requests are queued (not the optimistic rows), so several todos
 * can be typed in a row; the lists refetch once the last one settles.
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
        status: body.status ?? 'todo',
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
      if (temp.sprintId) {
        await queryClient.cancelQueries({ queryKey: qk.board(temp.sprintId) });
        updateCachedBoards((todos, board) => (board.sprint.id === temp.sprintId ? [...todos, temp] : todos));
      }
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
    onSettled: (_data, _error, { body }) => {
      // Still counted while settling: 1 means no other create is waiting (plan §9.2). A board
      // composer creates in one sprint at a time, so its board and the sprint stats follow.
      if (queryClient.isMutating({ mutationKey }) === 1) invalidateAfterTodoChange(projectId, [body.sprintId ?? null]);
    },
  });

  return {
    ...mutation,
    /**
     * Creates with the BL-2 defaults (task, medium, no points), in the backlog or in `place`
     * (a sprint and a status column); returns the temporary id.
     */
    create: (title: string, place?: CreatePlace) => {
      tempCounter += 1;
      const tempId = `${TEMP_PREFIX}${tempCounter}`;
      const body: CreateTodoRequest = place ? { title, sprintId: place.sprintId, status: place.status } : { title };
      mutation.mutate({ body, tempId });
      return tempId;
    },
  };
}

/**
 * `POST /projects/:id/todos/bulk` (AI-2): saves the drafts the user kept. Not optimistic — the
 * dialog shows "Adding…" — and the new todos go to the end of the cached backlog at once, in
 * the order the server returns them, then the lists refetch.
 */
export function useBulkCreateTodos(projectId: string) {
  return useMutation({
    mutationFn: (todos: CreateTodoRequest[]) => bulkCreateTodos(projectId, { todos }),
    onSuccess: (created) => {
      queryClient.setQueryData<Todo[]>(qk.todos(projectId, {}), (list) => (list ? [...list, ...created] : list));
      invalidateAfterTodoChange(projectId, []);
    },
  });
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

const NO_KEYS: ReadonlyMap<string, string> = new Map();

/** `select`: key → id for every saved todo (temporary rows have no key yet). Stable, so memoized. */
function keyToId(todos: Todo[]): ReadonlyMap<string, string> {
  return new Map(todos.filter((todo) => todo.key).map((todo) => [todo.key, todo.id]));
}

/**
 * This project's todo keys, for linking the keys an AI answer mentions (`KAN-22` → `?todo=<id>`).
 * The same list the backlog uses, so it is usually cached already.
 */
export function useTodoKeyMap(projectId: string): ReadonlyMap<string, string> {
  return useProjectTodos(projectId, keyToId).data ?? NO_KEYS;
}
