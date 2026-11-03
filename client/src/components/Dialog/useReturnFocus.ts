import { useRef } from 'react';

/**
 * Radix modal dialogs return focus to their `Trigger` on close, and to nothing (`<body>`)
 * when opened without one, as our controlled dialogs are. This remembers whatever had focus
 * when the dialog opened and puts focus back there on close (DESIGN §10.3).
 */
export function useReturnFocus() {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    /** For `onOpenAutoFocus`: runs before Radix moves focus into the dialog. */
    capture: () => {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    /** For `onCloseAutoFocus`. Falls back to Radix's behaviour if the opener is gone. */
    restore: (event: Event) => {
      const target = returnTo.current;
      returnTo.current = null;
      if (target?.isConnected) {
        event.preventDefault();
        target.focus();
      }
    },
  };
}
