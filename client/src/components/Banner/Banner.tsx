import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import styles from './Banner.module.css';

type BannerTone = 'warning' | 'danger';

const ICONS: Record<BannerTone, IconName> = { warning: 'warning-outline', danger: 'status-error' };

interface BannerProps {
  /** `warning`: offline, unsaved changes. `danger`: save failed. */
  tone: BannerTone;
  children: ReactNode;
  /** Usually a small subtle Button ("Retry now", "Retry"); it inherits the banner color. */
  action?: ReactNode;
  /** `page` spans the shell edge to edge (Offline); `inline` sits in a dialog (Save error). */
  layout?: 'page' | 'inline';
  /**
   * `status` (polite) or `alert` (assertive). Defaults: warning → status, danger → alert,
   * as on the canvas.
   */
  role?: 'status' | 'alert';
  className?: string;
}

/** DESIGN §7 Banner: padding 8 16, 13/500, gap 10, tone icon, message, optional action. */
export function Banner({ tone, children, action, layout = 'page', role, className }: BannerProps) {
  return (
    <div
      role={role ?? (tone === 'danger' ? 'alert' : 'status')}
      className={cx(styles.banner, styles[tone], styles[layout], 'kb-pop', className)}
    >
      <Icon name={ICONS[tone]} className={styles.icon} />
      <span className={styles.message}>{children}</span>
      {action && <span className={styles.action}>{action}</span>}
    </div>
  );
}
