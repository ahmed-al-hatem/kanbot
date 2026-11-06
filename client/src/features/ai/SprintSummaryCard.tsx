import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { useSprintSummaryRequest, useSummarizeSprint } from '@/hooks/useAi';
import { getT, useFormat, useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { sprintDay } from '@/lib/dates';
import { announce } from '@/stores/announcer';
import type { Sprint } from '@/types/api';
import { AiErrorPanel, GeneratedAt } from './AiParts';
import { LazyMarkdown } from './LazyMarkdown';
import styles from './SprintSummaryCard.module.css';

/** The writing skeleton: heading, two lines, heading, two lines (widths in %, heights in px). */
const SKELETON_LINES = [
  { inlineSize: '30%', blockSize: 14, gap: false },
  { inlineSize: '85%', blockSize: 12, gap: false },
  { inlineSize: '70%', blockSize: 12, gap: false },
  { inlineSize: '25%', blockSize: 14, gap: true },
  { inlineSize: '78%', blockSize: 12, gap: false },
  { inlineSize: '60%', blockSize: 12, gap: false },
] as const;

interface SprintSummaryCardProps {
  /** An active or completed sprint (the server answers 409 for a planned one). */
  sprint: Sprint;
  /** Runs before a todo key in the summary opens Todo details (the board's dialog closes). */
  onOpenTodo?: () => void;
  className?: string;
}

/**
 * AI-4 (DESIGN §9 10). An active sprint's card is a "Mid-sprint summary · Day N of M" with the
 * live stats above the AI text. The saved summary as Markdown with "Generated <time>" and Regenerate, or
 * Summarize when there is none yet; a skeleton while it is written; the server's message and Try
 * again when it fails. It follows a request started elsewhere too — Complete sprint's "Generate AI
 * summary" lands on the sprint's page while the request is still running.
 */
export function SprintSummaryCard({ sprint, onOpenTodo, className }: SprintSummaryCardProps) {
  const t = useT();
  const copy = t.ai.summary;
  const summarize = useSummarizeSprint();
  const request = useSprintSummaryRequest(sprint.id);
  const pending = request?.status === 'pending';
  const error = request?.status === 'error' ? request.error : null;
  const summary = sprint.summary;
  const headingId = `summary-${sprint.id}`;
  const active = sprint.status === 'active';
  const day = active ? sprintDay(sprint.startDate, sprint.endDate) : null;
  const title = active
    ? day
      ? copy.midSprintDay(day.day, day.total)
      : copy.midSprint
    : copy.title;

  const run = () => {
    summarize.mutate(
      { sprint },
      {
        onSuccess: () => {
          announce(getT().ai.summary.ready(sprint.name));
        },
      },
    );
  };

  return (
    <section
      className={cx(styles.card, className)}
      aria-labelledby={headingId}
      aria-busy={pending || undefined}
    >
      <header className={styles.header}>
        <h3 id={headingId} className={styles.title}>
          <Icon name="ai-sparkle" className={styles.sparkle} />
          {title}
        </h3>
        {summary ? (
          <Button
            variant="subtle"
            icon="refresh"
            className={styles.action}
            loading={pending}
            loadingText={copy.regenerating}
            onClick={run}
          >
            {copy.regenerate}
          </Button>
        ) : (
          <Button variant="ai" loading={pending} loadingText={copy.summarizing} onClick={run}>
            {copy.summarize}
          </Button>
        )}
      </header>

      {/*
       * The real numbers first. For a sprint that is still running, the server's prompt asks the
       * model whether the goal "was met" (assistant.service.ts), so its text can read like a
       * finished sprint; these live stats are the facts.
       */}
      {active && <LiveStats sprint={sprint} />}

      {pending ? (
        <div role="status" className={styles.skeleton}>
          <span className="visually-hidden">{copy.generating}</span>
          {SKELETON_LINES.map((line, index) => (
            <Skeleton
              key={index}
              inlineSize={line.inlineSize}
              blockSize={line.blockSize}
              className={line.gap ? styles.skeletonGap : undefined}
            />
          ))}
        </div>
      ) : error ? (
        <div className={styles.body}>
          <AiErrorPanel compact title={copy.failedTitle} error={error} onRetry={run} />
          {summary && (
            <SavedSummary
              content={summary.content}
              generatedAt={summary.generatedAt}
              projectId={sprint.projectId}
              onOpenTodo={onOpenTodo}
            />
          )}
        </div>
      ) : summary ? (
        <div className={cx(styles.body, 'kb-rise')}>
          <SavedSummary
            content={summary.content}
            generatedAt={summary.generatedAt}
            projectId={sprint.projectId}
            onOpenTodo={onOpenTodo}
          />
        </div>
      ) : (
        <p className={styles.empty}>
          {sprint.status === 'active' ? copy.emptyActive : copy.emptyCompleted}
        </p>
      )}
    </section>
  );
}

function LiveStats({ sprint }: { sprint: Sprint }) {
  const t = useT();
  const format = useFormat();
  const copy = t.ai.summary;
  const { doneTodos, totalTodos, donePoints, totalPoints } = sprint.stats;
  const left = format.daysRemaining(sprint.endDate);
  return (
    <p className={styles.stats}>
      <span className="visually-hidden">{copy.soFar}</span>
      {copy.liveStats(doneTodos, totalTodos, donePoints, totalPoints)}
      {left && copy.left(left)}
    </p>
  );
}

interface SavedSummaryProps {
  content: string;
  generatedAt: string;
  projectId: string;
  onOpenTodo: (() => void) | undefined;
}

function SavedSummary({ content, generatedAt, projectId, onOpenTodo }: SavedSummaryProps) {
  const copy = useT().ai.summary;
  return (
    <>
      <LazyMarkdown projectId={projectId} onOpenTodo={onOpenTodo}>
        {content}
      </LazyMarkdown>
      <p className={styles.meta}>
        {copy.generatedBefore}
        <GeneratedAt iso={generatedAt} />
        {copy.generatedAfter}
      </p>
    </>
  );
}
