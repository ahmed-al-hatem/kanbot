import type { ComponentPropsWithRef } from 'react';
import { cx } from '@/lib/cx';
import { useFieldControl } from './fieldContext';
import styles from './Field.module.css';

/**
 * Values that are Latin by nature: left to right in Arabic too (the Arabic canvas sets
 * `dir="ltr"` on email and password), so «you@example.com» never reads as «example.com@you».
 */
const LTR_TYPES: ReadonlySet<string> = new Set(['email', 'password', 'url', 'tel']);

/**
 * 36px text input. Inside a `<Field>` it picks up id, describedby, invalid and required.
 * Email, password, URL and phone inputs are `dir="ltr"` unless `dir` is passed (the project key
 * passes it too).
 */
export function Input({ className, type = 'text', dir, ...props }: ComponentPropsWithRef<'input'>) {
  const control = useFieldControl(props);
  return (
    <input
      type={type}
      dir={dir ?? (LTR_TYPES.has(type) ? 'ltr' : undefined)}
      className={cx(styles.control, className)}
      {...control}
    />
  );
}

/** Multi-line input; resizes vertically only. */
export function Textarea({ className, rows = 3, ...props }: ComponentPropsWithRef<'textarea'>) {
  const control = useFieldControl(props);
  return (
    <textarea rows={rows} className={cx(styles.control, styles.textarea, className)} {...control} />
  );
}
