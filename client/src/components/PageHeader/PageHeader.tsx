import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  /** The page's only h1 (DESIGN §10.2). The shell moves focus to it on route change. */
  title: string;
  /** Muted text after the title, e.g. "5 projects" or the project name and key. */
  meta?: ReactNode;
  /** Inline-end buttons: Ask AI, then the primary action. */
  actions?: ReactNode;
  className?: string;
}

/** DESIGN §6 page header: 64px, h1 · meta · actions, a divider underneath. */
export function PageHeader({ title, meta, actions, className }: PageHeaderProps) {
  return (
    <header className={cx(styles.header, className)}>
      {/* tabIndex -1: a focus target for route changes, not a Tab stop. */}
      <h1 className={cx('page-title', styles.title)} tabIndex={-1}>
        {title}
      </h1>
      {meta && <span className={styles.meta}>{meta}</span>}
      <span className={styles.spacer} />
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
