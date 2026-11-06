import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRef, type ReactElement, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import styles from './Menu.module.css';

interface MenuProps {
  /** The button that opens the menu, usually an `IconButton` with an aria-label. */
  trigger: ReactElement;
  /** Accessible name of the menu, e.g. "KAN-12 actions". Defaults to the trigger's name. */
  label?: string;
  children: ReactNode;
  /** Which edge of the trigger the menu lines up with. */
  align?: 'start' | 'end';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Runs as the menu hands focus back to its trigger. An item that opens a dialog sets it
   * open here, so the dialog opens after the menu is gone and returns focus to the trigger.
   */
  onCloseAutoFocus?: (event: Event) => void;
  className?: string;
}

/**
 * DESIGN §7 Menu on Radix DropdownMenu: `role="menu"`, the first item focused on open,
 * ↑ ↓ Home End and typeahead between items, Esc or an outside click closes and refocuses
 * the trigger. The trigger gets `aria-haspopup` / `aria-expanded` / `aria-controls`.
 */
export function Menu({
  trigger,
  label,
  children,
  align = 'end',
  open,
  onOpenChange,
  onCloseAutoFocus,
  className,
}: MenuProps) {
  // Set on open, consumed by the first focus of the panel (see onFocus below).
  const justOpened = useRef(false);

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        justOpened.current = next;
        onOpenChange?.(next);
      }}
    >
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label={label}
          // Radix labels the menu by its trigger; an explicit label replaces that.
          {...(label ? { 'aria-labelledby': undefined } : {})}
          align={align}
          sideOffset={4}
          collisionPadding={8}
          loop
          className={cx(styles.menu, className)}
          onCloseAutoFocus={onCloseAutoFocus}
          onFocus={(event) => {
            // Radix focuses the panel on open and only moves to the first item for keyboard
            // opens; DESIGN §10.3 wants it always. Only the first panel focus after opening
            // counts: Radix also refocuses the panel when the pointer leaves an item.
            if (!justOpened.current || event.target !== event.currentTarget) return;
            justOpened.current = false;
            event.currentTarget
              .querySelector<HTMLElement>('[role^="menuitem"]:not([data-disabled])')
              ?.focus();
          }}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface MenuItemProps {
  children: ReactNode;
  onSelect?: () => void;
  icon?: IconName;
  /** `danger` turns the text red (Delete). */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Also fires on pointer hover: Radix focuses the item under the pointer. Used to prefetch. */
  onFocus?: () => void;
}

export function MenuItem({
  children,
  onSelect,
  icon,
  tone = 'default',
  disabled,
  onFocus,
}: MenuItemProps) {
  return (
    <DropdownMenu.Item
      className={cx(styles.item, tone === 'danger' && styles.danger)}
      onSelect={onSelect}
      disabled={disabled}
      onFocus={onFocus}
    >
      {icon && <Icon name={icon} className={styles.icon} />}
      <span className={styles.text}>{children}</span>
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className={styles.separator} />;
}

/** Small uppercase heading above a group of items, e.g. "Move to". */
export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className={styles.label}>{children}</DropdownMenu.Label>;
}
