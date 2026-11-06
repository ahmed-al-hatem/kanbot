import { useId, useRef } from 'react';
import { BidiText } from '@/components/BidiText/BidiText';
import { Button, ButtonLink, IconButton } from '@/components/Button/Button';
import { Menu, MenuItem, MenuSeparator } from '@/components/Menu/Menu';
import type { BacklogGroup } from '@/hooks/useBacklog';
import { useT } from '@/i18n';
import type { Sprint } from '@/types/api';
import styles from './Backlog.module.css';

type SprintAction = 'edit' | 'delete';

interface SprintActionsProps {
  group: BacklogGroup;
  sprint: Sprint;
  /** The project's active sprint, if another one is running. */
  activeSprint: Sprint | null;
  boardPath: string;
  onStart: (group: BacklogGroup) => void;
  onEdit: (sprint: Sprint) => void;
  onDelete: (group: BacklogGroup) => void;
}

/**
 * The inline-end of a sprint group's header (DESIGN §7, §9 04). Planned: **Start sprint**
 * (SPR-3; disabled with the reason while another sprint is active — a click still explains it
 * in a toast) and ⋯ with Edit and Delete (SPR-2). Active: a **Complete sprint** link to the
 * board and ⋯ with Edit only; active sprints can't be deleted (the server answers 409).
 */
export function SprintActions({
  group,
  sprint,
  activeSprint,
  boardPath,
  onStart,
  onEdit,
  onDelete,
}: SprintActionsProps) {
  const t = useT();
  const copy = t.backlog.sprint;
  const reasonId = useId();
  const pending = useRef<SprintAction | null>(null);
  const blockedBy =
    group.kind === 'planned' && activeSprint && activeSprint.id !== sprint.id ? activeSprint : null;

  return (
    <>
      {group.kind === 'active' ? (
        <ButtonLink to={boardPath} size="sm" variant="subtle" icon="board">
          {copy.complete}
        </ButtonLink>
      ) : (
        <>
          {blockedBy && (
            <span id={reasonId} className={styles.groupHint}>
              <BidiText>{copy.blockedBy(blockedBy.name)}</BidiText>
            </span>
          )}
          <Button
            size="sm"
            variant="primary"
            // Focusable and clickable (a native `disabled` can't explain itself): the click toasts why.
            aria-disabled={blockedBy ? true : undefined}
            aria-describedby={blockedBy ? reasonId : undefined}
            onClick={() => {
              onStart(group);
            }}
          >
            {copy.start}
          </Button>
        </>
      )}
      <Menu
        label={copy.menu(sprint.name)}
        onCloseAutoFocus={() => {
          const action = pending.current;
          pending.current = null;
          if (action === 'edit') onEdit(sprint);
          if (action === 'delete') onDelete(group);
        }}
        trigger={
          <IconButton
            size="sm"
            icon="show-more-horizontal"
            aria-label={copy.actions(sprint.name)}
          />
        }
      >
        <MenuItem
          icon="pencil"
          onSelect={() => {
            pending.current = 'edit';
          }}
        >
          {copy.edit}
        </MenuItem>
        {group.kind === 'planned' && (
          <>
            <MenuSeparator />
            <MenuItem
              icon="delete"
              tone="danger"
              onSelect={() => {
                pending.current = 'delete';
              }}
            >
              {copy.delete}
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
}
