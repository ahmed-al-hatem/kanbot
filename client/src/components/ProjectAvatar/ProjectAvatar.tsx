import { cx } from '@/lib/cx';
import styles from './ProjectAvatar.module.css';

/** Canvas palette for project letters, in its order. */
const TONES = ['purple', 'teal', 'green', 'orange', 'magenta', 'blue'] as const;

interface ProjectAvatarProps {
  /** The project's id: picks the hue, so a project looks the same on its tile and in the switcher. */
  id: string;
  name: string;
  /** 22 in menus, 24 in the switcher, 40 on tiles and in the New project preview. */
  size?: 22 | 24 | 40;
  className?: string;
}

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/**
 * DESIGN §6 project avatar: the first letter on `--lz-<hue>-bg`. Always decorative — the
 * project name is written next to it.
 */
export function ProjectAvatar({ id, name, size = 24, className }: ProjectAvatarProps) {
  const tone = TONES[hash(id) % TONES.length] ?? 'blue';
  const letter = name.trim().charAt(0).toUpperCase() || '?';
  return (
    // The letter is drawn by CSS (`::before`), not a text node: axe's label-content-name-mismatch
    // counts every on-screen text node, aria-hidden or not, so a letter here made the project
    // switcher's visible text "AKanbot App…" and no label could contain it (WCAG 2.5.3).
    <span
      className={cx(styles.avatar, styles[`s${size}`], styles[tone], className)}
      data-letter={letter}
      aria-hidden="true"
    />
  );
}
