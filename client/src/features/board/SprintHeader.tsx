import { Lozenge } from '@/components/Lozenge/Lozenge';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { useFormat, useT } from '@/i18n';
import { daysBetween, todayIso } from '@/lib/dates';
import type { Sprint } from '@/types/api';
import styles from './Board.module.css';

/**
 * DESIGN §9 05 header (SPR-4): sprint name, Active lozenge, dates and days remaining, the goal
 * on one line, and progress for points **and** todos (Done only, plan §2 #10). The numbers are
 * the board cache's live stats, so they follow a move before the server answers. The sprint's
 * name is data and stays as stored.
 */
export function SprintHeader({ sprint }: { sprint: Sprint }) {
  const t = useT();
  const format = useFormat();
  const { header } = t.board;
  const { progress } = t.sprints;
  const { donePoints, totalPoints, doneTodos, totalTodos } = sprint.stats;
  const dates = format.range(sprint.startDate, sprint.endDate);
  const remaining = format.daysRemaining(sprint.endDate);
  const late = sprint.endDate !== null && daysBetween(todayIso(), sprint.endDate) < 0;

  return (
    <div className={styles.sprintHeader}>
      <div className={styles.sprintTitleRow}>
        <h2 className={styles.sprintName}>
          <bdi>{sprint.name}</bdi>
        </h2>
        <Lozenge tone="blue" live>
          {t.sprints.status.active}
        </Lozenge>
        {dates && <span className={styles.sprintDates}>{dates}</span>}
        {remaining && (
          <span className={late ? styles.sprintLate : styles.sprintDates}>
            {header.remaining(remaining)}
          </span>
        )}
      </div>
      {sprint.goal && (
        <p className={styles.sprintGoal} title={sprint.goal}>
          <b>{t.sprints.goalLabel}</b> <bdi>{sprint.goal}</bdi>
        </p>
      )}
      <div className={styles.progressRows}>
        <div className={styles.progressRow}>
          <ProgressBar
            height={8}
            value={donePoints}
            max={totalPoints}
            label={progress.pointsLabel(sprint.name)}
            valueText={progress.pointsValue(donePoints, totalPoints)}
            className={styles.progressBar}
          />
          <span className={styles.progressText}>
            <b>{header.fraction(donePoints, totalPoints)}</b>
            {header.pointsDone(totalPoints)}
          </span>
        </div>
        <div className={styles.progressRow}>
          <ProgressBar
            height={8}
            value={doneTodos}
            max={totalTodos}
            label={progress.todosLabel(sprint.name)}
            valueText={progress.todosValue(doneTodos, totalTodos)}
            className={styles.progressBar}
          />
          <span className={styles.progressText}>
            <b>{header.fraction(doneTodos, totalTodos)}</b>
            {header.todosDone(totalTodos)}
          </span>
        </div>
      </div>
    </div>
  );
}
