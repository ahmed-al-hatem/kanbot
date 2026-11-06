import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useId, type ReactNode } from 'react';
import { BidiText } from '@/components/BidiText/BidiText';
import { IconButton } from '@/components/Button/Button';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import type { BacklogGroup as Group } from '@/hooks/useBacklog';
import { useFormat, useT } from '@/i18n';
import { cx } from '@/lib/cx';
import type { Todo } from '@/types/api';
import styles from './Backlog.module.css';
import { groupDropId, type DropData } from '@/lib/dnd/sensors';
import { TodoRow, type MoveTargetGroup, type RowMove } from './TodoRow';

interface BacklogGroupProps {
  group: Group;
  /** The rows to show: the todos that pass the filters, or the drag preview's order. */
  rows: readonly Todo[];
  filtering: boolean;
  collapsed: boolean;
  onToggle: (groupId: string) => void;
  /** A drag is over this group (DESIGN §7: same drag-over style as a board column). */
  isOver: boolean;
  highlightIds: readonly string[];
  moveTargets: readonly MoveTargetGroup[];
  onOpen: (todoId: string) => void;
  onDelete: (todo: Todo) => void;
  onMove: (todo: Todo, move: RowMove) => void;
  onKeyMove: (todo: Todo, direction: 'up' | 'down') => void;
  /** Inline-end of the header: Start sprint / Complete sprint and the sprint's ⋯ menu. */
  actions?: ReactNode;
  /** Replaces the empty line when the group is empty (the Backlog's empty state). */
  empty?: ReactNode;
  /** Under the rows: the Backlog's quick create. */
  footer?: ReactNode;
}

/**
 * DESIGN §7 Backlog group: collapse chevron, title, status lozenge, dates and "N todos · P pts",
 * the sprint actions, then its rows. The group is a drop target as a whole (so an empty or
 * collapsed group still takes a drop) and its rows are a sortable list (BL-5, BL-7).
 */
export function BacklogGroup({
  group,
  rows,
  filtering,
  collapsed,
  onToggle,
  isOver,
  highlightIds,
  moveTargets,
  onOpen,
  onDelete,
  onMove,
  onKeyMove,
  actions,
  empty,
  footer,
}: BacklogGroupProps) {
  const t = useT();
  const format = useFormat();
  const copy = t.backlog.group;
  const headingId = useId();
  const bodyId = useId();
  const dates = group.sprint ? format.range(group.sprint.startDate, group.sprint.endDate) : null;
  const summary = format.todosAndPoints(group.todos.length, group.points);
  const reorderable = group.kind !== 'active';
  const { setNodeRef } = useDroppable({
    id: groupDropId(group.id),
    data: { type: 'group', groupId: group.id } satisfies DropData,
    disabled: filtering,
  });

  const emptyLine =
    group.todos.length > 0 && filtering ? (
      <p className={styles.groupMessage}>
        <BidiText>{copy.noMatch(group.name)}</BidiText>
      </p>
    ) : (
      (empty ??
      (filtering || group.kind === 'backlog' ? (
        <p className={styles.groupMessage}>
          <BidiText>{copy.empty(group.name)}</BidiText>
        </p>
      ) : (
        <p className={cx(styles.groupMessage, styles.dropHint)}>
          <BidiText>{copy.dropHint(group.name)}</BidiText>
        </p>
      )))
    );

  return (
    <section
      ref={setNodeRef}
      className={cx(styles.group, isOver && styles.over)}
      aria-labelledby={headingId}
    >
      <div className={styles.groupHeader}>
        <IconButton
          size="sm"
          icon="chevron-down"
          className={styles.toggle}
          aria-label={copy.toggle(group.name)}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          onClick={() => {
            onToggle(group.id);
          }}
        />
        <h2 id={headingId} className={styles.groupTitle}>
          <bdi>{group.name}</bdi>
        </h2>
        {group.kind === 'active' && (
          <Lozenge tone="blue" live>
            {copy.active}
          </Lozenge>
        )}
        {group.kind === 'planned' && <Lozenge>{copy.planned}</Lozenge>}
        <span className={styles.groupMeta}>{dates ? copy.meta(dates, summary) : summary}</span>
        {actions && <span className={styles.groupActions}>{actions}</span>}
      </div>

      <div id={bodyId} hidden={collapsed} className={cx('kb-rise', styles.groupBody)}>
        <SortableContext
          id={group.id}
          items={rows.map((todo) => todo.id)}
          strategy={verticalListSortingStrategy}
        >
          {rows.length > 0 ? (
            <ul className={styles.rows} aria-label={copy.rows(group.name)}>
              {rows.map((todo, index) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  index={index}
                  groupId={group.id}
                  reorderable={reorderable}
                  moveTargets={moveTargets}
                  highlighted={highlightIds.includes(todo.id)}
                  dragDisabled={filtering}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onMove={onMove}
                  onKeyMove={onKeyMove}
                />
              ))}
            </ul>
          ) : (
            emptyLine
          )}
        </SortableContext>
        {footer}
      </div>
    </section>
  );
}
