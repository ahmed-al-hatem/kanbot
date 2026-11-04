import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { useSprintSummaryRequest, useSummarizeSprint } from '@/hooks/useAi';
import { cx } from '@/lib/cx';
import { daysRemaining, sprintDay } from '@/lib/format';
import { announce } from '@/stores/announcer';
import type { Sprint } from '@/types/api';
import { AiErrorPanel, GeneratedAt } from './AiParts';
import { LazyMarkdown } from './LazyMarkdown';
import styles from './SprintSummaryCard.module.css';

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
  const summarize = useSummarizeSprint();
  const request = useSprintSummaryRequest(sprint.id);
  const pending = request?.status === 'pending';
  const error = request?.status === 'error' ? request.error : null;
  const summary = sprint.summary;
  const headingId = `summary-${sprint.id}`;
  const active = sprint.status === 'active';
  const day = active ? sprintDay(sprint.startDate, sprint.endDate) : null;
  const title = active ? `Mid-sprint summary${day ? ` · Day ${day.day} of ${day.total}` : ''}` : 'AI summary';

  const run = () => {
    summarize.mutate(
      { sprint },
      {
        onSuccess: () => {
          announce(`${sprint.name} summary ready`);
        },
      },
    );
  };

  return (
    <section className={cx(styles.card, className)} aria-labelledby={headingId} aria-busy={pending || undefined}>
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
            loadingText="Regenerating…"
            onClick={run}
          >
            Regenerate
          </Button>
        ) : (
          <Button variant="ai" loading={pending} loadingText="Summarizing…" onClick={run}>
            Summarize
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
          <span className="visually-hidden">Generating summary</span>
          <Skeleton inlineSize="30%" blockSize={14} />
          <Skeleton inlineSize="85%" blockSize={12} />
          <Skeleton inlineSize="70%" blockSize={12} />
          <Skeleton inlineSize="25%" blockSize={14} className={styles.skeletonGap} />
          <Skeleton inlineSize="78%" blockSize={12} />
          <Skeleton inlineSize="60%" blockSize={12} />
        </div>
      ) : error ? (
        <div className={styles.body}>
          <AiErrorPanel compact title="Kanbot couldn't write the summary" error={error} onRetry={run} />
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
          {sprint.status === 'active'
            ? 'Get a quick read on how this sprint is going: progress, risks and what to do next.'
            : 'No summary yet. Kanbot can write one from what this sprint delivered.'}
        </p>
      )}
    </section>
  );
}

function LiveStats({ sprint }: { sprint: Sprint }) {
  const { doneTodos, totalTodos, donePoints, totalPoints } = sprint.stats;
  const left = daysRemaining(sprint.endDate);
  return (
    <p className={styles.stats}>
      <span className="visually-hidden">So far: </span>
      {doneTodos} of {totalTodos} todos done · {donePoints} of {totalPoints} pts done
      {left && <> · {left}</>}
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
  return (
    <>
      <LazyMarkdown projectId={projectId} onOpenTodo={onOpenTodo}>
        {content}
      </LazyMarkdown>
      <p className={styles.meta}>
        Generated <GeneratedAt iso={generatedAt} />. AI can make mistakes. Review before sharing.
      </p>
    </>
  );
}
