import { useId, useRef, useState } from 'react';
import { Button } from '@/components/Button/Button';
import { KeyHint } from '@/components/KeyHint/KeyHint';
import { useCreateTodo } from '@/hooks/useTodos';
import { getT, useT } from '@/i18n';
import { failureReason } from '@/i18n/errors';
import { cx } from '@/lib/cx';
import { announce } from '@/stores/announcer';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import type { TodoStatus } from '@/types/api';
import styles from './Board.module.css';

/** Server limit for a todo title (plan §2 #12). */
const TITLE_MAX = 200;

interface ColumnComposerProps {
  projectId: string;
  sprintId: string;
  status: TodoStatus;
  /** Column name in the UI language, for the labels: "New todo in In Progress". */
  columnName: string;
}

/**
 * DESIGN §7 Board column footer: a subtle "Create todo" that turns into the composer — a raised
 * card with a focus ring and a textarea. Enter adds the todo to this sprint and column and keeps
 * the composer open for the next one, Shift+Enter adds a new line, Esc cancels (focus back on
 * "Create todo"). The card shows at once (optimistic) and plays `kbDrop` when the server has it.
 */
export function ColumnComposer({ projectId, sprintId, status, columnName }: ColumnComposerProps) {
  const t = useT();
  const copy = t.board.composer;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const textareaId = useId();
  const openerRef = useRef<HTMLButtonElement>(null);
  const markTodo = useHighlight((s) => s.markTodo);
  const { create } = useCreateTodo(projectId, {
    onCreated: (todo) => {
      markTodo(todo.id);
      // The text of the moment the server answers (the language may have changed meanwhile).
      announce(getT().board.composer.created(todo.key, columnName));
    },
    onFailed: (error, failedTitle) => {
      const now = getT();
      toast.error(now.backlog.quickCreate.failed(failedTitle, failureReason(error, now)));
      setTitle((current) => current || failedTitle);
    },
  });

  const add = () => {
    // A title is one line on the server's side of things; Shift+Enter lines become spaces.
    const trimmed = title.replace(/\s+/g, ' ').trim();
    if (!trimmed) return;
    create(trimmed, { sprintId, status });
    setTitle('');
  };

  const cancel = () => {
    setTitle('');
    setOpen(false);
    // The composer is gone after this render; give focus back to its opener.
    requestAnimationFrame(() => {
      openerRef.current?.focus();
    });
  };

  if (!open) {
    return (
      <Button
        ref={openerRef}
        variant="subtle"
        icon="add"
        className={styles.composeButton}
        aria-label={copy.open(columnName)}
        // The `c` shortcut opens the first column's composer.
        data-shortcut={status === 'todo' ? 'create' : undefined}
        onClick={() => {
          setOpen(true);
        }}
      >
        {t.backlog.createTodo}
      </Button>
    );
  }

  return (
    <div className={cx(styles.composer, 'kb-pop')}>
      <label htmlFor={textareaId} className="visually-hidden">
        {copy.label(columnName)}
      </label>
      <textarea
        id={textareaId}
        className={styles.composerInput}
        rows={2}
        maxLength={TITLE_MAX}
        placeholder={copy.placeholder}
        // The composer was opened on purpose; focus belongs in it.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            add();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
      />
      <span className={styles.composerActions}>
        <span className={styles.composerHint} aria-hidden="true">
          <KeyHint text={copy.hint} />
        </span>
        <Button size="sm" variant="subtle" onClick={cancel}>
          {t.common.cancel}
        </Button>
        <Button size="sm" variant="primary" disabled={!title.trim()} onClick={add}>
          {copy.add}
        </Button>
      </span>
    </div>
  );
}
