import { useRef } from 'react';

/**
 * Radix modal dialogs return focus to their `Trigger` on close, and to nothing (`<body>`)
 * when opened without one, as our controlled dialogs are. This remembers whatever had focus
 * when the dialog opened and puts focus back there on close (DESIGN §10.3).
 */
export function useReturnFocus(fallback?: () => HTMLElement | null) {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    /** For `onOpenAutoFocus`: runs before Radix moves focus into the dialog. */
    capture: () => {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    /**
     * For `onCloseAutoFocus`. If the opener is gone (its row was deleted or moved), focus goes
     * to `fallback()`, then to Radix's behaviour.
     */
    restore: (event: Event) => {
      const opener = returnTo.current;
      returnTo.current = null;
      // Closed because another dialog opened (a todo key in an AI answer opens Todo details):
      // focus already belongs to that dialog, so don't pull it back to the opener.
      const active = document.activeElement;
      const closing = event.target instanceof Node ? event.target : null;
      const otherDialog = active?.closest('[role="dialog"], [role="alertdialog"]');
      if (otherDialog && !closing?.contains(otherDialog)) {
        event.preventDefault();
        return;
      }
      const target = opener?.isConnected ? opener : fallback?.();
      if (target) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
