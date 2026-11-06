import type { ComponentPropsWithRef } from 'react';
import { cx } from '@/lib/cx';
import { useFieldControl } from './fieldContext';
import styles from './Field.module.css';

/** 36px text input. Inside a `<Field>` it picks up id, describedby, invalid and required. */
export function Input({ className, type = 'text', ...props }: ComponentPropsWithRef<'input'>) {
  const control = useFieldControl(props);
  return <input type={type} className={cx(styles.control, className)} {...control} />;
}

/** Multi-line input; resizes vertically only. */
export function Textarea({ className, rows = 3, ...props }: ComponentPropsWithRef<'textarea'>) {
  const control = useFieldControl(props);
  return (
    <textarea rows={rows} className={cx(styles.control, styles.textarea, className)} {...control} />
  );
}
