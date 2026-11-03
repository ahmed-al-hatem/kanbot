import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** 24px icon in `--text-subtlest`; ignored when `illustration` is set. */
  icon?: IconName;
  /** Larger artwork, e.g. the empty-projects board drawing. */
  illustration?: ReactNode;
  /** Buttons or links under the text: the primary action last. */
  actions?: ReactNode;
  /**
   * `sunken` for "nothing here yet" (No projects, No active sprint);
   * `dashed` for "nothing matches" (search and filters).
   */
  variant?: 'sunken' | 'dashed';
  /** h2 on a page, h3 inside a section. */
  headingLevel?: 2 | 3;
  className?: string;
}

/** Empty states from DESIGN §11, laid out as on the canvas: centered icon, title, text, actions. */
export function EmptyState({
  title,
  description,
  icon,
  illustration,
  actions,
  variant = 'sunken',
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className={cx(styles.empty, styles[variant], 'kb-rise', className)}>
      {illustration ?? (icon && <Icon name={icon} size={24} className={styles.icon} />)}
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
