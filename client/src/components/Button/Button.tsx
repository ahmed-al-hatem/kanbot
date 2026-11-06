import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { Spinner } from '@/components/Spinner/Spinner';
import { cx } from '@/lib/cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'neutral' | 'subtle' | 'ai' | 'danger';
/** md = 32px (default), lg = 40px (auth forms), sm = 28px (banners, composers). */
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading 16px icon. The `ai` variant shows `ai-sparkle` unless told otherwise. */
  icon?: IconName;
}

function buttonClass(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cx(styles.button, styles[variant], styles[size], className);
}

function Content({
  variant,
  icon,
  children,
}: {
  variant: ButtonVariant;
  icon?: IconName;
  children: ReactNode;
}) {
  const leading = icon ?? (variant === 'ai' ? 'ai-sparkle' : undefined);
  return (
    <>
      {leading && <Icon name={leading} className={styles.icon} />}
      {children}
    </>
  );
}

export interface ButtonProps extends ComponentPropsWithRef<'button'>, StyleProps {
  /**
   * Shows the spinner (plus `loadingText`) and blocks clicks. The button stays focusable
   * (`aria-disabled`, not `disabled`) so keyboard focus isn't dropped mid-save.
   */
  loading?: boolean;
  /** The verb shown while loading, e.g. "Saving…" (DESIGN §7). */
  loadingText?: string;
}

/**
 * DESIGN §7 Button. Idle and loading labels share one grid cell, so the button is as wide
 * as the longer of the two and never changes width when it starts or stops loading.
 */
export function Button({
  variant = 'neutral',
  size = 'md',
  icon,
  loading = false,
  loadingText,
  type = 'button',
  className,
  children,
  onClick,
  ...rest
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      // Also cancels the implicit form submit that pressing Enter in a field triggers.
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {/* Without a verb the hidden label still names the button for screen readers. */}
      <span className={styles.label} aria-hidden={(loading && Boolean(loadingText)) || undefined}>
        <Content variant={variant} icon={icon}>
          {children}
        </Content>
      </span>
      {(loading || loadingText) && (
        <span className={styles.pending} aria-hidden={!loading || undefined}>
          <Spinner />
          {loadingText}
        </span>
      )}
    </button>
  );
}

export type ButtonLinkProps = LinkProps & StyleProps;

/** A router link that looks like a Button, for actions that navigate ("Back to Projects"). */
export function ButtonLink({
  variant = 'neutral',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      <span className={styles.label}>
        <Content variant={variant} icon={icon}>
          {children}
        </Content>
      </span>
    </Link>
  );
}

export interface IconButtonProps
  extends
    Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'>,
    Pick<StyleProps, 'variant'> {
  /** Required by the type: an icon-only button has no other accessible name (DESIGN §7). */
  'aria-label': string;
  icon: IconName;
  /** md = 32×32 (default), sm = 28×28 (tile and row ⋯ menus). */
  size?: 'sm' | 'md';
}

/** Square icon-only button. Subtle by default. */
export function IconButton({
  icon,
  variant = 'subtle',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, cx(styles.iconOnly, className))}
      {...rest}
    >
      <Icon name={icon} className={styles.icon} />
    </button>
  );
}
