import { useState, type Ref } from 'react';
import { isApiError } from '@/api/errors';
import { Icon } from '@/components/Icon/Icon';
import { useCreateTodo } from '@/hooks/useTodos';
import { cx } from '@/lib/cx';
import { announce } from '@/stores/announcer';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import styles from './Backlog.module.css';

/** Server limit for a todo title (plan §2 #12). */
const TITLE_MAX = 200;

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
  const [title, setTitle] = useState('');
  const markTodo = useHighlight((s) => s.markTodo);
  const { create } = useCreateTodo(projectId, {
    onCreated: (todo) => {
      markTodo(todo.id);
      announce(`${todo.key} created`);
    },
    onFailed: (error, failedTitle) => {
      toast.error(`Couldn't create “${failedTitle}”. ${isApiError(error) ? error.message : 'Please try again.'}`);
      // Give the title back, unless the user is already typing the next one.
      setTitle((current) => current || failedTitle);
    },
  });

  return (
    <label className={styles.quickCreate}>
      <Icon name="add" />
      <span className="visually-hidden">Create todo</span>
      <input
        ref={inputRef}
        type="text"
        data-quick-create
        className={styles.quickCreateInput}
        placeholder="Create todo — type a title and press Enter"
        maxLength={TITLE_MAX}
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
          <kbd>Enter</kbd> to add
        </span>
      )}
    </label>
  );
}
