import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import styles from './Avatar.module.css';

interface AvatarProps {
  /** Full name; initials are derived from it. Omit for the dashed "unassigned" circle. */
  name?: string;
  size?: 24 | 28 | 32;
  /** Picks `--av-1…4` (index mod 4). Defaults to a stable hash of the name. */
  colorIndex?: number;
  /** Set when the name is already written next to the avatar. */
  decorative?: boolean;
  className?: string;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/** DESIGN §7 Avatar: round, initials at 700 in `--av-fg` on `--av-N`, spring scale on hover. */
export function Avatar({
  name,
  size = 24,
  colorIndex,
  decorative = false,
  className,
}: AvatarProps) {
  const t = useT();
  const a11y = decorative
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': name ?? t.common.unassigned };

  if (!name) {
    return (
      <span
        className={cx(styles.avatar, styles[`s${size}`], styles.unassigned, className)}
        {...a11y}
      />
    );
  }
  const tone = ((colorIndex ?? hash(name)) % 4) + 1;
  return (
    <span
      className={cx(styles.avatar, styles[`s${size}`], styles[`av${tone}`], className)}
      {...a11y}
    >
      <span aria-hidden="true">{initials(name)}</span>
    </span>
  );
}
