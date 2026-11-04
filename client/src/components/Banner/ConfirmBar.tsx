import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import styles from './Banner.module.css';

interface ConfirmBarProps {
  /** The question, e.g. "Discard your unsaved changes?" */
  children: ReactNode;
  /** Accessible name of the bar (`role="alertdialog"`). */
  label: string;
  /** Safe choice, focused when the bar appears (DESIGN §10.3). */
  keepLabel: string;
  /** Destructive choice, in the danger variant. */
  confirmLabel: string;
  onKeep: () => void;
  onConfirm: () => void;
  className?: string;
}

/**
 * DESIGN §7 Unsaved-changes confirm bar: `--warning-bg`, radius 8, `role="alertdialog"`,
 * "Keep editing" focused on open and "Discard" in danger. Lives inside a dialog, above its footer.
 */
export function ConfirmBar({ children, label, keepLabel, confirmLabel, onKeep, onConfirm, className }: ConfirmBarProps) {
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  return (
    <div
      role="alertdialog"
      aria-label={label}
      className={cx(styles.banner, styles.warning, styles.inline, 'kb-pop', className)}
    >
      <Icon name="warning-outline" className={styles.icon} />
      <span className={styles.message}>{children}</span>
      <span className={styles.action}>
        <Button ref={keepRef} variant="subtle" size="sm" onClick={onKeep}>
          {keepLabel}
        </Button>
        <Button variant="danger" size="sm" className={styles.confirm} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </span>
    </div>
  );
}
