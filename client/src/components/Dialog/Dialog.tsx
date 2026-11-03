import * as RadixDialog from '@radix-ui/react-dialog';
import { useRef, type ReactElement, type ReactNode } from 'react';
import { IconButton } from '@/components/Button/Button';
import { cx } from '@/lib/cx';
import styles from './Dialog.module.css';
import { useReturnFocus } from './useReturnFocus';

/** Max widths from DESIGN §3.5, named after the dialog that uses them. */
export type DialogSize = 'session' | 'complete' | 'sprint' | 'project' | 'todo' | 'generate' | 'plan';

interface DialogProps {
  open: boolean;
  /**
   * Called on Esc, a blanket click and the close button. A parent with unsaved edits can
   * ignore `false` and show its confirm bar instead: the dialog is fully controlled.
   */
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Optional line under the title, wired to `aria-describedby`. */
  description?: ReactNode;
  size?: DialogSize;
  /** Body; scrolls when taller than the viewport. */
  children: ReactNode;
  /** Inline-end footer actions: Cancel, then the primary action. */
  footer?: ReactNode;
  /** Inline-start footer actions, e.g. Delete (DESIGN §7). */
  footerStart?: ReactNode;
  /** Optional element that opens the dialog. Either way focus returns to whatever had it before. */
  trigger?: ReactElement;
  className?: string;
}

/**
 * DESIGN §7 Dialog on Radix: focus trap, Esc, focus restore, `aria-modal`, the rest of the
 * page hidden from screen readers. On open, focus goes to `[data-autofocus]` or the panel
 * (DESIGN §10.3). Blanket and panel animate out on `data-state="closed"` (DESIGN §8.2).
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'project',
  children,
  footer,
  footerStart,
  trigger,
  className,
}: DialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const returnFocus = useReturnFocus();

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.blanket}>
          <RadixDialog.Content
            ref={contentRef}
            className={cx(styles.panel, styles[size], className)}
            // Radix hides the rest of the page but doesn't set this; DESIGN §7 asks for it.
            aria-modal="true"
            onOpenAutoFocus={(event) => {
              returnFocus.capture();
              event.preventDefault();
              focusInitial(contentRef.current);
            }}
            onCloseAutoFocus={returnFocus.restore}
            // Without a description Radix expects an explicit opt-out.
            {...(description ? {} : { 'aria-describedby': undefined })}
          >
            <header className={styles.header}>
              <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
              <RadixDialog.Close asChild>
                <IconButton icon="cross" aria-label="Close" />
              </RadixDialog.Close>
            </header>
            <div className={styles.body}>
              {description && (
                <RadixDialog.Description className={styles.description}>{description}</RadixDialog.Description>
              )}
              {children}
            </div>
            {(footer ?? footerStart) && (
              <footer className={styles.footer}>
                {footerStart}
                <span className={styles.spacer} />
                {footer}
              </footer>
            )}
          </RadixDialog.Content>
        </RadixDialog.Overlay>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function focusInitial(panel: HTMLElement | null) {
  const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel;
  target?.focus();
}
