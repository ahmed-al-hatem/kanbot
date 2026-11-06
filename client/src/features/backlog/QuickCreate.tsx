import { useState, type Ref } from 'react';
import { Icon } from '@/components/Icon/Icon';
import { KeyHint } from '@/components/KeyHint/KeyHint';
import { TODO_TITLE_MAX } from '@/features/todos/todoSchema';
import { useCreateTodo } from '@/hooks/useTodos';
import { getT, useT } from '@/i18n';
import { failureReason } from '@/i18n/errors';
import { cx } from '@/lib/cx';
import { announce } from '@/stores/announcer';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import styles from './Backlog.module.css';

interface QuickCreateProps {
  projectId: string;
  inputRef?: Ref<HTMLInputElement>;
}

/**
 * BL-2 / DESIGN §7 inline create at the bottom of the Backlog: Enter creates a Task (medium,
 * no points) and keeps focus here for the next one; Esc cancels what was typed. The row
 * shows at once (optimistic) and plays `kbAdded` when the server has it.
 */
export function QuickCreate({ projectId, inputRef }: QuickCreateProps) {
  const t = useT();
  const copy = t.backlog.quickCreate;
  const [title, setTitle] = useState('');
  const markTodo = useHighlight((s) => s.markTodo);
  const { create } = useCreateTodo(projectId, {
    // getT(): the language when the request settles, not when this rendered.
    onCreated: (todo) => {
      markTodo(todo.id);
      announce(getT().backlog.quickCreate.created(todo.key));
    },
    onFailed: (error, failedTitle) => {
      const messages = getT();
      toast.error(messages.backlog.quickCreate.failed(failedTitle, failureReason(error, messages)));
      // Give the title back, unless the user is already typing the next one.
      setTitle((current) => current || failedTitle);
    },
  });

  return (
    <label className={styles.quickCreate}>
      <Icon name="add" />
      <span className="visually-hidden">{copy.label}</span>
      <input
        ref={inputRef}
        type="text"
        data-quick-create
        data-shortcut="create"
        className={styles.quickCreateInput}
        placeholder={copy.placeholder}
        maxLength={TODO_TITLE_MAX}
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const trimmed = title.trim();
            if (!trimmed) return;
            create(trimmed);
            setTitle('');
          } else if (event.key === 'Escape' && title) {
            // Cancels the draft; focus stays so the user can start again or Tab away.
            event.preventDefault();
            setTitle('');
          }
        }}
      />
      {title.trim() && (
        <span className={cx(styles.quickCreateHint, 'kb-pop')} aria-hidden="true">
          <KeyHint text={copy.hint} />
        </span>
      )}
    </label>
  );
}
