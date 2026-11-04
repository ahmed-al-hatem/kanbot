import { Lozenge } from '@/components/Lozenge/Lozenge';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { daysRemaining, formatRange } from '@/lib/format';
import type { Sprint } from '@/types/api';
import styles from './Board.module.css';

/**
 * DESIGN §9 05 header (SPR-4): sprint name, Active lozenge, dates and days remaining, the goal
 * on one line, and progress for points **and** todos (Done only, plan §2 #10). The numbers are
 * the board cache's live stats, so they follow a move before the server answers.
 */
export function SprintHeader({ sprint }: { sprint: Sprint }) {
  const { donePoints, totalPoints, doneTodos, totalTodos } = sprint.stats;
  const dates = formatRange(sprint.startDate, sprint.endDate);
  const remaining = daysRemaining(sprint.endDate);
  const late = remaining?.startsWith('Ended') ?? false;

  return (
    <div className={styles.sprintHeader}>
      <div className={styles.sprintTitleRow}>
        <h2 className={styles.sprintName}>{sprint.name}</h2>
        <Lozenge tone="blue" live>
          Active
        </Lozenge>
        {dates && <span className={styles.sprintDates}>{dates}</span>}
        {remaining && <span className={late ? styles.sprintLate : styles.sprintDates}>· {remaining}</span>}
      </div>
      {sprint.goal && (
        <p className={styles.sprintGoal} title={sprint.goal}>
          <b>Goal:</b> {sprint.goal}
        </p>
      )}
      <div className={styles.progressRows}>
        <div className={styles.progressRow}>
          <ProgressBar
            height={8}
            value={donePoints}
            max={totalPoints}
            label={`${sprint.name} points done`}
            valueText={`${donePoints} of ${totalPoints} points done`}
            className={styles.progressBar}
          />
          <span className={styles.progressText}>
            <b>
              {donePoints} / {totalPoints}
            </b>{' '}
            pts done
          </span>
        </div>
        <div className={styles.progressRow}>
          <ProgressBar
            height={8}
            value={doneTodos}
            max={totalTodos}
            label={`${sprint.name} todos done`}
            valueText={`${doneTodos} of ${totalTodos} todos done`}
            className={styles.progressBar}
          />
          <span className={styles.progressText}>
            <b>
              {doneTodos} / {totalTodos}
            </b>{' '}
            todos done
          </span>
        </div>
      </div>
    </div>
  );
}
