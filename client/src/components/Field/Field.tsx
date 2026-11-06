import { useId, type ReactNode } from 'react';
import { Icon } from '@/components/Icon/Icon';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { FieldContext } from './fieldContext';
import styles from './Field.module.css';

interface FieldProps {
  label: ReactNode;
  /** One control: Input, Textarea, Select, DateInput or TagInput. */
  children: ReactNode;
  /** 12/16 hint under the control. Replaced by the error while there is one. */
  help?: ReactNode;
  /** Shown under the control with a shake, and marks the control `aria-invalid`. */
  error?: string;
  /** Adds ` *` to the label and `aria-required` to the control. */
  required?: boolean;
  /** Control id; generated when omitted. */
  id?: string;
  className?: string;
}

/**
 * DESIGN §7 Text field: label 4px above the control, then the error or the help text,
 * both linked to the control with `aria-describedby` (DESIGN §10.5).
 */
export function Field({
  label,
  children,
  help,
  error,
  required = false,
  id,
  className,
}: FieldProps) {
  const t = useT();
  const autoId = useId();
  const controlId = id ?? `field${autoId}`;
  const errorId = `${controlId}-error`;
  const helpId = `${controlId}-help`;
  const describedBy = error ? errorId : help ? helpId : undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={controlId} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {t.common.requiredMark}
          </span>
        )}
      </label>
      <FieldContext value={{ id: controlId, describedBy, invalid: Boolean(error), required }}>
        {children}
      </FieldContext>
      {error ? (
        // Keyed by the message so a new error replays the shake.
        <p key={error} id={errorId} role="alert" className={cx(styles.error, 'kb-shake')}>
          <Icon name="status-error" size={12} />
          {error}
        </p>
      ) : (
        help && (
          <p id={helpId} className={styles.help}>
            {help}
          </p>
        )
      )}
    </div>
  );
}
