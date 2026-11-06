import { useCallback } from 'react';
import { useDeleteTodo } from '@/hooks/useTodos';
import { getT } from '@/i18n';
import { refocusAfterRemoval } from '@/lib/refocus';
import { toast } from '@/stores/toast';
import type { Todo } from '@/types/api';
import { todoNeighbourFocus } from './todoFocus';
import { todoErrorMessage } from './todoErrors';

/**
 * The confirmed delete (BL-4), shared by the row menu and Todo details: optimistic removal,
 * a toast either way (the row comes back on failure), and focus moved to the neighbouring
 * todo once the row has gone.
 */
export function useRemoveTodo() {
  const { mutate } = useDeleteTodo({
    // getT(): the language when the request settles, not when the hook rendered.
    onDeleted: (todo) => {
      toast.success(getT().todos.toast.deleted(todo.key));
    },
    onFailed: (error, todo) => {
      const t = getT();
      toast.error(t.todos.toast.deleteFailed(todo.key, todoErrorMessage(error, t)));
    },
  });

  // Stable, so memoized rows don't re-render (`mutate` is stable too).
  return useCallback(
    // `focus` lets a caller that captured the neighbour earlier (Todo details) pass it in.
    (todo: Todo, focus: () => HTMLElement | null = todoNeighbourFocus(todo.id)) => {
      refocusAfterRemoval(focus);
      mutate(todo);
    },
    [mutate],
  );
}
