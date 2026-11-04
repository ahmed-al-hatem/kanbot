import { lazy, Suspense, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useTodoKeyMap } from '@/hooks/useTodos';
import { cx } from '@/lib/cx';
import { linkTodoKeys, stripInternalIds } from './aiText';
import styles from './Markdown.module.css';

// react-markdown + remark are ~40–50 KB gz: loaded with the first AI answer, never up front (plan §5.4).
const Markdown = lazy(() => import('./Markdown'));

interface LazyMarkdownProps {
  /** AI text as the server sent it. */
  children: string;
  /** The project whose todo keys become links. */
  projectId: string;
  /** Runs before a linked todo opens, e.g. to close the drawer that shows the text. */
  onOpenTodo?: () => void;
  className?: string;
}

/**
 * AI text as Markdown: internal `[id:…]` markers removed, this project's todo keys linked to
 * `?todo=<id>`. Until the Markdown chunk is in, the cleaned plain text, so nothing jumps or blanks.
 */
export function LazyMarkdown({ children, projectId, onOpenTodo, className }: LazyMarkdownProps) {
  const [, setParams] = useSearchParams();
  const keyToId = useTodoKeyMap(projectId);
  const text = stripInternalIds(children);

  const openTodo = useCallback(
    (todoId: string) => {
      onOpenTodo?.();
      // Pushed, so Back closes the dialog (as from a row or a card).
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('todo', todoId);
        return next;
      });
    },
    [onOpenTodo, setParams],
  );

  return (
    <Suspense fallback={<div className={cx(styles.markdown, styles.plain, className)}>{text}</div>}>
      <Markdown className={className} onOpenTodo={openTodo}>
        {linkTodoKeys(text, keyToId)}
      </Markdown>
    </Suspense>
  );
}
