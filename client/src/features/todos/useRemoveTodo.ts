import { useCallback } from 'react';
import { isApiError } from '@/api/errors';
import { useDeleteTodo } from '@/hooks/useTodos';
import { refocusAfterRemoval } from '@/lib/refocus';
import { toast } from '@/stores/toast';
import type { Todo } from '@/types/api';
import { todoNeighbourFocus } from './todoFocus';

/**
 * The confirmed delete (BL-4), shared by the row menu and Todo details: optimistic removal,
 * a toast either way (the row comes back on failure), and focus moved to the neighbouring
 * todo once the row has gone.
 */
export function useRemoveTodo() {
  const { mutate } = useDeleteTodo({
    onDeleted: (todo) => {
      toast.success(`${todo.key} deleted`);
    },
    onFailed: (error, todo) => {
      toast.error(`Couldn't delete ${todo.key}. ${isApiError(error) ? error.message : 'Please try again.'}`);
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
