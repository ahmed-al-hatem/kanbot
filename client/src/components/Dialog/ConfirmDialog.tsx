import * as AlertDialog from '@radix-ui/react-alert-dialog';
import type { ReactElement, ReactNode } from 'react';
import { BidiText } from '@/components/BidiText/BidiText';
import { Button } from '@/components/Button/Button';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import styles from './Dialog.module.css';
import { useReturnFocus } from './useReturnFocus';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names the thing, e.g. "Delete project Kanbot?" (PRJ-4, BL-4). */
  title: ReactNode;
  /** What happens, e.g. "Its 24 todos and 3 sprints are deleted too." */
  description: ReactNode;
  confirmLabel: string;
  /** Shown with a spinner while `pending`, e.g. "Deleting…". */
  pendingLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive actions (default), `primary` otherwise. */
  tone?: 'danger' | 'primary';
  /** While true the confirm button spins and the dialog can't be dismissed. */
  pending?: boolean;
  /** The parent closes the dialog when the action succeeds (or right away if optimistic). */
  onConfirm: () => void;
  /** Where focus goes on close when the opener is gone (e.g. its row was just deleted). */
  fallbackFocus?: () => HTMLElement | null;
  trigger?: ReactElement;
}

/**
 * Confirmation on Radix AlertDialog (`role="alertdialog"`): no blanket dismiss, Cancel is
 * focused on open so Enter never confirms by accident, focus returns to the opener on close.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  tone = 'danger',
  pending = false,
  onConfirm,
  fallbackFocus,
  trigger,
}: ConfirmDialogProps) {
  const t = useT();
  const returnFocus = useReturnFocus(fallbackFocus);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.blanket}>
          <AlertDialog.Content
            className={cx(styles.panel, styles.session, styles.confirm)}
            aria-modal="true"
            // Only remember the opener: Radix then focuses Cancel itself.
            onOpenAutoFocus={returnFocus.capture}
            onCloseAutoFocus={returnFocus.restore}
          >
            <AlertDialog.Title className={styles.title}>
              <BidiText>{title}</BidiText>
            </AlertDialog.Title>
            <AlertDialog.Description className={styles.confirmText}>
              <BidiText>{description}</BidiText>
            </AlertDialog.Description>
            <div className={styles.confirmActions}>
              <AlertDialog.Cancel asChild>
                <Button variant="subtle" disabled={pending}>
                  {cancelLabel ?? t.common.cancel}
                </Button>
              </AlertDialog.Cancel>
              {/* Not AlertDialog.Action: that closes immediately, before the request settles. */}
              <Button
                variant={tone}
                loading={pending}
                loadingText={pendingLabel}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
