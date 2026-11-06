import { useState, type ReactNode } from 'react';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { StatTile } from '@/components/StatTile/StatTile';
import { useCompleteSprint } from '@/hooks/useSprints';
import { useFormat, useT } from '@/i18n';
import { errorMessage } from '@/i18n/errors';
import { cx } from '@/lib/cx';
import type { Sprint } from '@/types/api';
import styles from './Board.module.css';

const BACKLOG = 'backlog';

export interface Completed {
  sprint: Sprint;
  /** The planned sprint that took the unfinished todos, or null for the backlog. */
  destination: string | null;
  /** How many unfinished todos moved there. */
  moved: number;
}

interface CompleteSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** The active sprint, with live stats from the board cache. */
  sprint: Sprint;
  /** Where unfinished todos can go besides the backlog, oldest first. */
  planned: readonly Sprint[];
  onCompleted: (result: Completed) => void;
  /**
   * Slot for phase 7 (AI-4): the "Generate AI summary" checkbox goes here, under the
   * destination choice and above the footer (DESIGN §9 11).
   */
  summaryOption?: ReactNode;
}

/**
 * Complete sprint (SPR-6, DESIGN §9 11): "X todos done · Y unfinished", done / not finished
 * tiles and points, then radio cards for where the unfinished todos go — the Backlog (default)
 * or any planned sprint. "Complete sprint" shows "Completing…" and can't be sent twice; a
 * failure (e.g. 409, the sprint was completed in another tab) stays in the dialog, read in the
 * UI language at render (the error is kept, not its text). Sprint names are data.
 */
export function CompleteSprintDialog({
  open,
  onOpenChange,
  projectId,
  sprint,
  planned,
  onCompleted,
  summaryOption,
}: CompleteSprintDialogProps) {
  const t = useT();
  const format = useFormat();
  const copy = t.board.complete;
  const complete = useCompleteSprint(projectId);
  const [target, setTarget] = useState(BACKLOG);
  const [formError, setFormError] = useState<unknown>(null);
  const { doneTodos, totalTodos, donePoints, totalPoints } = sprint.stats;
  const unfinished = totalTodos - doneTodos;
  const choice =
    target === BACKLOG || planned.some((item) => item.id === target) ? target : BACKLOG;

  const submit = () => {
    setFormError(null);
    const destination = planned.find((item) => item.id === choice)?.name ?? null;
    complete.mutate(
      { sprintId: sprint.id, body: { moveUnfinishedTo: choice } },
      {
        onSuccess: (saved) => {
          onCompleted({ sprint: saved, destination, moved: unfinished });
        },
        onError: (error) => {
          setFormError(error);
        },
      },
    );
  };

  const options = [
    { id: BACKLOG, name: t.backlog.groupName, hint: null as string | null },
    ...planned.map((item) => ({
      id: item.id,
      name: item.name,
      hint: item.startDate ? copy.plannedStarts(format.day(item.startDate)) : copy.planned,
    })),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!complete.isPending) onOpenChange(next);
      }}
      title={copy.title(sprint.name)}
      size="complete"
      description={copy.description(doneTodos, unfinished)}
      footer={
        <>
          <Button
            variant="subtle"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            loading={complete.isPending}
            loadingText={copy.completing}
            onClick={submit}
            data-autofocus={unfinished === 0 ? true : undefined}
          >
            {copy.confirm}
          </Button>
        </>
      }
    >
      <div className={styles.complete}>
        {formError !== null && (
          <Banner tone="danger" layout="inline">
            {errorMessage(formError, t)}
          </Banner>
        )}
        <div className={styles.completeStats}>
          <StatTile
            size="sm"
            label={copy.done}
            value={t.count.todos(doneTodos)}
            tone="success"
            index={0}
          />
          <StatTile
            size="sm"
            label={copy.notFinished}
            value={t.count.todos(unfinished)}
            index={1}
          />
        </div>
        <p className={styles.completePoints}>{copy.points(donePoints, totalPoints)}</p>
        {unfinished > 0 ? (
          <fieldset className={styles.radioGroup}>
            <legend className={styles.radioLegend}>{copy.legend(unfinished)}</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className={cx(styles.radioCard, choice === option.id && styles.radioOn)}
              >
                <input
                  type="radio"
                  name="move-unfinished"
                  value={option.id}
                  checked={choice === option.id}
                  data-autofocus={option.id === BACKLOG ? true : undefined}
                  onChange={() => {
                    setTarget(option.id);
                  }}
                />
                <span className={styles.radioName}>{option.name}</span>
                {option.hint && <span className={styles.radioHint}>{copy.hint(option.hint)}</span>}
              </label>
            ))}
          </fieldset>
        ) : (
          <p className={styles.completeNote}>{copy.allDone}</p>
        )}
        {/* Phase 7 (AI-4): the "Generate AI summary" checkbox renders here. */}
        {summaryOption}
      </div>
    </Dialog>
  );
}
