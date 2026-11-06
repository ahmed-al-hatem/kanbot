import { useT } from '@/i18n';
import { passwordStrength } from './passwordStrength';
import styles from './PasswordStrengthMeter.module.css';

interface PasswordStrengthMeterProps {
  id: string;
  password: string;
}

/**
 * DESIGN §9 02: a 4px bar plus a label under the password. The text is readable by screen
 * readers through the input's `aria-describedby` (`id`); the bar itself is decorative.
 */
export function PasswordStrengthMeter({ id, password }: PasswordStrengthMeterProps) {
  const t = useT();
  const { level, key } = passwordStrength(password);
  const label = t.auth.register.strength[key];
  const empty = password.length === 0;

  return (
    <div className={styles.meter}>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} data-level={empty ? 'empty' : level} />
      </span>
      <span id={id} className={styles.label}>
        {/* One text node for screen readers: split spans lose the space ("strength:Too short"). */}
        {!empty && (
          <>
            <span className="visually-hidden">{t.auth.register.strength.spoken(label)}</span>
            <span aria-hidden="true">{label}</span>
          </>
        )}
      </span>
    </div>
  );
}
