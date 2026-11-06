import { memo, type ReactNode } from 'react';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import { PointsPill } from '@/components/Chip/PointsPill';
import { PageError } from '@/components/PageError/PageError';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { StatTile } from '@/components/StatTile/StatTile';
import { PriorityLabel } from '@/features/todos/PriorityLabel';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { useBoard } from '@/hooks/useBoard';
import { useFormat, useT } from '@/i18n';
import { boardTodos } from '@/lib/board';
import { cx } from '@/lib/cx';
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
  const t = useT();
  const format = useFormat();
  const copy = t.sprints.history.detail;
  const { tiles } = copy;
  const board = useBoard(sprint.id);
  const status = SPRINT_STATUS[sprint.status];
  const numbers = sprintNumbers(sprint);
  const dates = format.range(sprint.startDate, sprint.endDate);
  const todos = board.data ? boardTodos(board.data) : undefined;

  const lastTile =
    sprint.status === 'completed'
      ? { label: tiles.carriedOver, value: t.count.todos(numbers.carriedOver ?? 0) }
      : sprint.status === 'active'
        ? { label: tiles.notFinished, value: t.count.todos(numbers.unfinished) }
        : { label: tiles.carriedOver, value: tiles.none };

  return (
    <section className={cx(styles.detail, 'kb-rise')} aria-labelledby="sprint-detail-title">
      <div className={styles.detailHead}>
        <div className={styles.detailTitleRow}>
          <h2 id="sprint-detail-title" className={styles.detailTitle}>
            {sprint.name}
          </h2>
          <Lozenge tone={status.tone} live={status.live}>
            {t.sprints.status[sprint.status]}
          </Lozenge>
        </div>
        <p className={styles.detailMeta}>
          {dates ?? copy.noDates}
          {sprint.completedAt && copy.completedOn(format.timestamp(sprint.completedAt))}
        </p>
        {sprint.goal && (
          <p className={styles.detailGoal}>
            <b>{t.sprints.goalLabel}</b> {sprint.goal}
          </p>
        )}
      </div>

      <div className={styles.stats}>
        <StatTile index={0} label={tiles.completed} value={t.count.todos(numbers.doneTodos)} />
        <StatTile
          index={1}
          label={tiles.pointsDone}
          value={tiles.fraction(numbers.donePoints, numbers.totalPoints)}
        />
        <StatTile
          index={2}
          label={tiles.completion}
          value={tiles.percent(numbers.completion)}
          tone="success"
        />
        <StatTile index={3} label={lastTile.label} value={lastTile.value} />
      </div>
      {sprint.status === 'completed' && <p className={styles.snapshotNote}>{copy.snapshotNote}</p>}

      {summary}

      <div className={styles.todoSection}>
        <h3 className={styles.todoHeading}>
          {copy.todos}
          {todos && <span className={styles.todoCount}>{copy.todoCount(todos.length)}</span>}
        </h3>
        {board.isPending ? (
          <div role="status" aria-busy="true" className={styles.todoRows}>
            <span className="visually-hidden">{copy.loadingTodos(sprint.name)}</span>
            {[1, 0.7, 0.4].map((opacity) => (
              <Skeleton key={opacity} blockSize={20} opacity={opacity} />
            ))}
          </div>
        ) : board.error ? (
          <PageError
            page={copy.todosPage(sprint.name)}
            error={board.error}
            backTo={false}
            onRetry={() => {
              void board.refetch();
            }}
            retrying={board.isRefetching}
          />
        ) : todos && todos.length > 0 ? (
          <ul className={styles.todoRows} aria-label={copy.todosLabel(sprint.name)}>
            {todos.map((todo) => (
              <SprintTodoRow key={todo.id} todo={todo} onOpen={onOpenTodo} />
            ))}
          </ul>
        ) : (
          <p className={styles.noTodos}>{copy.noTodos[sprint.status]}</p>
        )}
      </div>
    </section>
  );
}

const SprintTodoRow = memo(function SprintTodoRow({
  todo,
  onOpen,
}: {
  todo: Todo;
  onOpen: (todoId: string) => void;
}) {
  const t = useT();
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
        {t.todos.status[todo.status]}
      </Lozenge>
      <PriorityLabel priority={todo.priority} className={styles.todoPriority} />
      <PointsPill points={todo.storyPoints} />
    </li>
  );
});
