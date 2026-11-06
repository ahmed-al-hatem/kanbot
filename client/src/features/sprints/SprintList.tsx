import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { useFormat, useT } from '@/i18n';
import { cx } from '@/lib/cx';
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
  const t = useT();
  const format = useFormat();
  const copy = t.sprints.history.list;
  const { progress } = t.sprints;
  return (
    <nav className={styles.list} aria-labelledby="sprint-list-title">
      <h2 id="sprint-list-title" className={styles.listTitle}>
        {copy.title}
      </h2>
      <ul className={styles.items}>
        {sprints.map((sprint, index) => {
          const status = SPRINT_STATUS[sprint.status];
          const { donePoints, totalPoints } = sprintNumbers(sprint);
          const selected = sprint.id === selectedId;
          const sprintPath = `/projects/${projectId}/sprints/${sprint.id}`;
          return (
            <li
              key={sprint.id}
              className="kb-rise kb-stagger"
              style={{ '--i': index } as CSSProperties}
            >
              <Link
                to={sprintPath}
                className={cx(styles.item, selected && styles.selected)}
                aria-current={selected ? 'page' : undefined}
              >
                <span className={styles.itemTop}>
                  <span className={styles.itemName}>{sprint.name}</span>
                  <Lozenge tone={status.tone} live={status.live}>
                    {t.sprints.status[sprint.status]}
                  </Lozenge>
                </span>
                <span className={styles.itemMeta}>
                  <span>{format.range(sprint.startDate, sprint.endDate) ?? copy.noDates}</span>
                  <span className={styles.itemPoints}>{copy.points(donePoints, totalPoints)}</span>
                </span>
                <ProgressBar
                  height={4}
                  value={donePoints}
                  max={totalPoints}
                  label={progress.pointsLabel(sprint.name)}
                  valueText={progress.pointsValue(donePoints, totalPoints)}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
