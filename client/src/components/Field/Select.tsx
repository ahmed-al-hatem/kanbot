import type { ComponentPropsWithRef } from 'react';
import { Icon } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import { useFieldControl } from './fieldContext';
import styles from './Field.module.css';

/** Native `<select>` with the chevron drawn at inline-end 10px (DESIGN §7). */
export function Select({ className, children, ...props }: ComponentPropsWithRef<'select'>) {
  const control = useFieldControl(props);
  return (
    <span className={styles.adorned}>
      <select className={cx(styles.control, styles.select, className)} {...control}>
        {children}
      </select>
      <Icon name="chevron-down" className={styles.adornment} />
    </span>
  );
}

/**
 * Native `type=date` with the browser's picker indicator made invisible under our calendar
 * icon (clicks still reach it in Chromium). `color-scheme` follows the theme via `<html>`.
 */
export function DateInput({ className, ...props }: Omit<ComponentPropsWithRef<'input'>, 'type'>) {
  const control = useFieldControl(props);
  return (
    <span className={styles.adorned}>
      <input type="date" className={cx(styles.control, styles.date, className)} {...control} />
      <Icon name="calendar" className={styles.adornment} />
    </span>
  );
}
