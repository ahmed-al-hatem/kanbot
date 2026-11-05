import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { cx } from '@/lib/cx';
import { useToast, type Toast, type ToastKind } from '@/stores/toast';
import type { ToastIconName } from './toastIconPaths';
import { ToastIcon } from './toastIcons';
import styles from './Toaster.module.css';

/** Matches `kbFlagOut` (200ms, DESIGN §8.2). */
const EXIT_MS = 200;

const ICONS: Record<ToastKind, { name: ToastIconName; className: string | undefined }> = {
  success: { name: 'check-circle', className: styles.success },
  error: { name: 'status-error', className: styles.error },
  info: { name: 'lightbulb', className: styles.info },
};

/**
 * DESIGN §7 Flag: one toast at a time at the bottom inline-start corner. The `role="status"`
 * region is always mounted, so screen readers announce a toast when it is added. The timer
 * pauses while the pointer or focus is on the toast, so an action like Undo stays reachable.
 */
export function Toaster() {
  const current = useToast((s) => s.toast);
  return (
    <div role="status" aria-live="polite" className={styles.region}>
      {/* Keyed by id: a replacing toast restarts its timer and its entry animation. */}
      {current && <Flag key={current.id} toast={current} />}
    </div>
  );
}

function Flag({ toast }: { toast: Toast }) {
  const dismiss = useToast((s) => s.dismiss);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = () => {
    setLeaving(true);
    clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      dismiss(toast.id);
    }, EXIT_MS);
  };

  const onTimeout = useEffectEvent(close);

  useEffect(() => {
    if (toast.duration === null || paused || leaving) return;
    const hide = setTimeout(() => {
      onTimeout();
    }, toast.duration);
    return () => {
      clearTimeout(hide);
    };
  }, [toast.duration, paused, leaving]);

  useEffect(
    () => () => {
      clearTimeout(exitTimer.current);
    },
    [],
  );

  const icon = ICONS[toast.kind];
  const { action } = toast;

  return (
    <div
      className={cx(styles.flag, leaving && styles.leaving)}
      onMouseEnter={() => {
        setPaused(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
      }}
      onFocus={() => {
        setPaused(true);
      }}
      onBlur={() => {
        setPaused(false);
      }}
    >
      <ToastIcon name={icon.name} className={cx(styles.icon, icon.className)} />
      <span className={styles.message}>{toast.message}</span>
      {action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            action.onClick();
            close();
          }}
        >
          {action.label}
        </button>
      )}
      <button type="button" className={styles.close} aria-label="Dismiss" onClick={close}>
        <ToastIcon name="cross" size={12} />
      </button>
    </div>
  );
}
