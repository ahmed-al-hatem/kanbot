import { createContext, use, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { cx } from '@/lib/cx';
import { TODO_HREF_PREFIX } from './aiText';
import styles from './Markdown.module.css';

/** Opens a todo from a linked key; given by the Markdown that renders the link. */
const OpenTodoContext = createContext<((todoId: string) => void) | undefined>(undefined);

/**
 * A linked todo key (`#todo=<id>`, see `linkTodoKeys`) opens `?todo=<id>` in the app; any other
 * link leaves in a new tab without access to the app (plan §9.5).
 */
function Link({
  node: _node,
  href = '',
  children,
  ...props
}: ComponentPropsWithoutRef<'a'> & { node?: unknown }) {
  const openTodo = use(OpenTodoContext);
  if (href.startsWith(TODO_HREF_PREFIX)) {
    const todoId = decodeURIComponent(href.slice(TODO_HREF_PREFIX.length));
    const todoHref = `?todo=${encodeURIComponent(todoId)}`;
    return (
      <a
        {...props}
        href={todoHref}
        className={styles.todoLink}
        onClick={(event) => {
          event.preventDefault();
          openTodo?.(todoId);
        }}
      >
        {children}
      </a>
    );
  }
  return (
    <a {...props} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

const COMPONENTS: Components = { a: Link };

interface MarkdownProps {
  children: string;
  onOpenTodo?: (todoId: string) => void;
  className?: string;
}

/**
 * AI Markdown (AI-1, AI-4). No `rehype-raw`: HTML in the text is shown as text, never parsed
 * (NFR-7), and the default `urlTransform` drops `javascript:` and other unsafe URLs. Loaded
 * lazily (plan §5.4) through `LazyMarkdown`, which cleans the text and links todo keys first.
 */
export default function Markdown({ children, onOpenTodo, className }: MarkdownProps) {
  return (
    <OpenTodoContext value={onOpenTodo}>
      {/* AI text keeps its own direction: an English reply reads LTR in the Arabic UI too. */}
      <div className={cx(styles.markdown, className)} dir="auto">
        <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
      </div>
    </OpenTodoContext>
  );
}
