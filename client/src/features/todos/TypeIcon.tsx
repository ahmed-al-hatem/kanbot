import type { TodoType } from '@/types/api';
import { Icon } from '@/components/Icon/Icon';
import styles from './TypeIcon.module.css';

const LABELS: Record<TodoType, string> = { task: 'Task', story: 'Story', bug: 'Bug' };

// Task and Story come from the Jira board, not the icon package (DESIGN §5.3).
const TASK_PATH =
  'm1 3c0-1.10457.89543-2 2-2h10c1.1046 0 2 .89543 2 2v10c0 1.1046-.8954 2-2 2h-10c-1.10457 0-2-.8954-2-2zm2-.5c-.27614 0-.5.22386-.5.5v10c0 .2761.22386.5.5.5h10c.2761 0 .5-.2239.5-.5v-10c0-.27614-.2239-.5-.5-.5zm9.3262 2.98014-5.00003 5.99996c-.1425.171-.35359.2699-.57617.2699s-.43367-.0989-.57617-.2699l-2.5-2.99996 1.15234-.96028 1.92383 2.3086 4.4238-5.3086z';
const STORY_PATH =
  'm4.98291 2.5c-.27614 0-.5.22386-.5.5v9.8059l3.51724-2.4727 3.51775 2.4728v-9.806c0-.27614-.2239-.5-.5-.5zm-2 .5c0-1.10457.89543-2 2-2h6.03499c1.1046 0 2 .89543 2 2v11.25c0 .2799-.1559.5366-.4043.6656s-.548.109-.777-.052l-3.8364-2.6968-3.83595 2.6968c-.229.1609-.5286.181-.77702.052-.24843-.129-.40432-.3857-.40432-.6656z';

interface TypeIconProps {
  type: TodoType;
  size?: 12 | 16;
  /** Set when text next to the icon already names the type. */
  decorative?: boolean;
}

/** Work-type icon. Alone it is `role="img"` with a label, so color is never the only signal. */
export function TypeIcon({ type, size = 16, decorative = false }: TypeIconProps) {
  const label = decorative ? undefined : LABELS[type];
  const className = styles[type];

  if (type === 'bug') {
    return <Icon name="bug" size={size} label={label} className={className} />;
  }
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 16 16" fill="none" focusable="false" {...a11y}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d={type === 'task' ? TASK_PATH : STORY_PATH}
      />
    </svg>
  );
}
