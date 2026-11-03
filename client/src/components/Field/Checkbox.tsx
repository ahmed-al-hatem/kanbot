import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Field.module.css';

interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  label: ReactNode;
  /** Secondary line under the label, linked with `aria-describedby`. */
  description?: ReactNode;
}

/** Native 16px checkbox with `accent-color: var(--brand)` (DESIGN §7). */
export function Checkbox({ label, description, id, className, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? `checkbox${autoId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className={cx(styles.checkbox, className)}>
      <input type="checkbox" id={inputId} aria-describedby={descriptionId} {...props} />
      <span className={styles.checkboxText}>
        <label htmlFor={inputId} className={styles.checkboxLabel}>
          {label}
        </label>
        {description && (
          <span id={descriptionId} className={styles.help}>
            {description}
          </span>
        )}
      </span>
    </div>
  );
}
