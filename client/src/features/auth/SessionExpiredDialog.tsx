import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button/Button';
// The shared blanket/panel styles, so this dialog animates and sizes like every other one.
import dialogStyles from '@/components/Dialog/Dialog.module.css';
import { Icon } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import { loginPath } from './redirect';
import styles from './SessionExpiredDialog.module.css';

interface SessionExpiredDialogProps {
  /** The page to come back to after logging in again. */
  redirectTo: string;
}

/**
 * DESIGN §9 "Session expired" (artboard S05) + AUTH-6: an alert dialog that Esc and the scrim
 * can't close, with one action that goes to `/login?redirect=<this page>`. The page underneath
 * stays mounted (and hidden from assistive tech by Radix) until then.
 */
export function SessionExpiredDialog({ redirectTo }: SessionExpiredDialogProps) {
  const navigate = useNavigate();
  const action = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root open>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={dialogStyles.blanket}>
          <AlertDialog.Content
            className={cx(dialogStyles.panel, dialogStyles.session, styles.panel)}
            aria-modal="true"
            // AlertDialog focuses its Cancel button, and this dialog has none: focus the one action.
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              action.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
            }}
          >
            <span className={styles.badge}>
              <Icon name="lock-locked" size={20} />
            </span>
            <AlertDialog.Title className={styles.title}>Your session has expired</AlertDialog.Title>
            <AlertDialog.Description className={styles.text}>
              Log in again to continue. You&apos;ll come back to this page.
            </AlertDialog.Description>
            <Button
              ref={action}
              variant="primary"
              size="lg"
              className={styles.action}
              onClick={() => {
                void navigate(loginPath(redirectTo));
              }}
            >
              Log in again
            </Button>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
