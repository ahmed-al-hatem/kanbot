import type { ComponentPropsWithRef } from 'react';
import { cx } from '@/lib/cx';
import styles from './ChipButton.module.css';

/** DESIGN §7 Chip button (AI quick prompts): 28px pill, 1px border, 12/500. */
export function ChipButton({
  className,
  type = 'button',
  ...props
}: ComponentPropsWithRef<'button'>) {
  return <button type={type} className={cx(styles.chip, className)} {...props} />;
}
