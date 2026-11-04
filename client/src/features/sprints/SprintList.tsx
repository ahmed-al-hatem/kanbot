import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { cx } from '@/lib/cx';
import { formatRange } from '@/lib/format';
import type { Sprint } from '@/types/api';
import { SPRINT_STATUS, sprintNumbers } from './sprintHistory';
import styles from './Sprints.module.css';

interface SprintListProps {
  projectId: string;
  sprints: readonly Sprint[];
  selectedId: string | undefined;
}

/**
 * DESIGN §7 Sprint list item (SPR-7): every sprint — active, planned, completed — with its name,
 * status lozenge (Active pulses), dates and points done / total. Each item is a link to the
 * sprint's page, so the selection lives in the URL; the selected one has `aria-current="page"`.
 */
export function SprintList({ projectId, sprints, selectedId }: SprintListProps) {
  return (
    <nav className={styles.list} aria-labelledby="sprint-list-title">
      <h2 id="sprint-list-title" className={styles.listTitle}>
        All sprints
      </h2>
      <ul className={styles.items}>
        {sprints.map((sprint, index) => {
          const status = SPRINT_STATUS[sprint.status];
          const { donePoints, totalPoints } = sprintNumbers(sprint);
          const selected = sprint.id === selectedId;
          return (
            <li key={sprint.id} className="kb-rise kb-stagger" style={{ '--i': index } as CSSProperties}>
              <Link
                to={`/projects/${projectId}/sprints/${sprint.id}`}
                className={cx(styles.item, selected && styles.selected)}
                aria-current={selected ? 'page' : undefined}
              >
                <span className={styles.itemTop}>
                  <span className={styles.itemName}>{sprint.name}</span>
                  <Lozenge tone={status.tone} live={status.live}>
                    {status.label}
                  </Lozenge>
                </span>
                <span className={styles.itemMeta}>
                  <span>{formatRange(sprint.startDate, sprint.endDate) ?? 'No dates'}</span>
                  <span className={styles.itemPoints}>
                    {donePoints} / {totalPoints} pts
                  </span>
                </span>
                <ProgressBar
                  height={4}
                  value={donePoints}
                  max={totalPoints}
                  label={`${sprint.name} points done`}
                  valueText={`${donePoints} of ${totalPoints} points done`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
