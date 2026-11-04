import { memo, type ReactNode } from 'react';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import { PointsPill } from '@/components/Chip/PointsPill';
import { PageError } from '@/components/PageError/PageError';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { StatTile } from '@/components/StatTile/StatTile';
import { PriorityLabel } from '@/features/todos/PriorityLabel';
import { STATUS_LABELS } from '@/features/todos/todoMeta';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { useBoard } from '@/hooks/useBoard';
import { boardTodos } from '@/lib/board';
import { cx } from '@/lib/cx';
import { formatRange, formatTimestamp, plural } from '@/lib/format';
import type { Sprint, Todo, TodoStatus } from '@/types/api';
import { SPRINT_STATUS, sprintNumbers } from './sprintHistory';
import styles from './Sprints.module.css';

const STATUS_TONE: Record<TodoStatus, 'gray' | 'blue' | 'purple' | 'green'> = {
  todo: 'gray',
  in_progress: 'blue',
  in_review: 'purple',
  done: 'green',
};

interface SprintDetailProps {
  sprint: Sprint;
  onOpenTodo: (todoId: string) => void;
  /**
   * Slot for phase 7 (AI-4): the sprint summary card (saved summary, Regenerate, generated
   * time) goes here, between the stat tiles and the todo list (DESIGN §9 10).
   */
  summary?: ReactNode;
}

/**
 * DESIGN §9 10 detail panel (SPR-7): name, lozenge, dates and goal; four stat tiles — the
 * completion snapshot (`completedStats`) for a completed sprint, live stats otherwise — and the
 * sprint's todos from `GET /sprints/:id/todos` (rows open `?todo=`). The tiles re-run their
 * entrance when another sprint is picked (`key` on the panel, in the page).
 */
export function SprintDetail({ sprint, onOpenTodo, summary }: SprintDetailProps) {
  const board = useBoard(sprint.id);
  const status = SPRINT_STATUS[sprint.status];
  const numbers = sprintNumbers(sprint);
  const dates = formatRange(sprint.startDate, sprint.endDate);
  const todos = board.data ? boardTodos(board.data) : undefined;

  const lastTile =
    sprint.status === 'completed'
      ? { label: 'Carried over', value: plural(numbers.carriedOver ?? 0, 'todo') }
      : sprint.status === 'active'
        ? { label: 'Not finished', value: plural(numbers.unfinished, 'todo') }
        : { label: 'Carried over', value: '—' };

  return (
    <section className={cx(styles.detail, 'kb-rise')} aria-labelledby="sprint-detail-title">
      <div className={styles.detailHead}>
        <div className={styles.detailTitleRow}>
          <h2 id="sprint-detail-title" className={styles.detailTitle}>
            {sprint.name}
          </h2>
          <Lozenge tone={status.tone} live={status.live}>
            {status.label}
          </Lozenge>
        </div>
        <p className={styles.detailMeta}>
          {dates ?? 'No dates yet'}
          {sprint.completedAt && <> · Completed {formatTimestamp(sprint.completedAt)}</>}
        </p>
        {sprint.goal && (
          <p className={styles.detailGoal}>
            <b>Goal:</b> {sprint.goal}
          </p>
        )}
      </div>

      <div className={styles.stats}>
        <StatTile index={0} label="Completed" value={plural(numbers.doneTodos, 'todo')} />
        <StatTile index={1} label="Points done" value={`${numbers.donePoints} / ${numbers.totalPoints}`} />
        <StatTile index={2} label="Completion" value={`${numbers.completion}%`} tone="success" />
        <StatTile index={3} label={lastTile.label} value={lastTile.value} />
      </div>
      {sprint.status === 'completed' && <p className={styles.snapshotNote}>Numbers as they were when the sprint was completed.</p>}

      {summary}

      <div className={styles.todoSection}>
        <h3 className={styles.todoHeading}>
          Todos{todos && <span className={styles.todoCount}> · {todos.length}</span>}
        </h3>
        {board.isPending ? (
          <div role="status" aria-busy="true" className={styles.todoRows}>
            <span className="visually-hidden">Loading {sprint.name} todos</span>
            {[1, 0.7, 0.4].map((opacity) => (
              <Skeleton key={opacity} blockSize={20} opacity={opacity} />
            ))}
          </div>
        ) : board.error ? (
          <PageError
            page={`${sprint.name}'s todos`}
            error={board.error}
            backTo={false}
            onRetry={() => {
              void board.refetch();
            }}
            retrying={board.isRefetching}
          />
        ) : todos && todos.length > 0 ? (
          <ul className={styles.todoRows} aria-label={`${sprint.name} todos`}>
            {todos.map((todo) => (
              <SprintTodoRow key={todo.id} todo={todo} onOpen={onOpenTodo} />
            ))}
          </ul>
        ) : (
          <p className={styles.noTodos}>
            {sprint.status === 'completed'
              ? 'No todos were done in this sprint.'
              : sprint.status === 'planned'
                ? 'No todos planned yet. Drag some in from the backlog.'
                : 'No todos in this sprint yet.'}
          </p>
        )}
      </div>
    </section>
  );
}

const SprintTodoRow = memo(function SprintTodoRow({ todo, onOpen }: { todo: Todo; onOpen: (todoId: string) => void }) {
  return (
    <li className={styles.todoRow}>
      <TypeIcon type={todo.type} />
      <span className={styles.todoKey}>{todo.key}</span>
      <button
        type="button"
        className={styles.todoTitle}
        data-todo-focus={todo.id}
        onClick={() => {
          onOpen(todo.id);
        }}
      >
        {todo.title}
      </button>
      <Lozenge tone={STATUS_TONE[todo.status]} className={styles.todoStatus}>
        {STATUS_LABELS[todo.status]}
      </Lozenge>
      <PriorityLabel priority={todo.priority} className={styles.todoPriority} />
      <PointsPill points={todo.storyPoints} />
    </li>
  );
});
