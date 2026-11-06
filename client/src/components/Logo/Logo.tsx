import { cx } from '@/lib/cx';
import { APP_NAME } from '@/lib/documentTitle';
import styles from './Logo.module.css';

interface LogoProps {
  /** 36 on the auth card, 28 in the sidebar, 24 in the mobile bar (DESIGN §5.4). */
  size?: 24 | 28 | 36;
  /** Show the "Kanbot" wordmark next to the mark. */
  wordmark?: boolean;
}

type Part = 'bg' | 'fg' | 'accent';

/** The mark's shapes on a 512 grid (kept as data: geometry, not text). */
const VIEW_BOX = '0 0 512 512';
const RECTS: readonly { x: number; y: number; width: number; height: number; rx: number; part: Part }[] = [
  { x: 0, y: 0, width: 512, height: 512, rx: 112, part: 'bg' },
  { x: 248, y: 100, width: 16, height: 60, rx: 8, part: 'fg' },
  { x: 78, y: 232, width: 44, height: 88, rx: 16, part: 'fg' },
  { x: 390, y: 232, width: 44, height: 88, rx: 16, part: 'fg' },
  { x: 104, y: 148, width: 304, height: 252, rx: 68, part: 'fg' },
  { x: 144, y: 190, width: 224, height: 168, rx: 40, part: 'bg' },
  { x: 176, y: 220, width: 40, height: 108, rx: 12, part: 'fg' },
  { x: 236, y: 220, width: 40, height: 76, rx: 12, part: 'fg' },
  { x: 296, y: 220, width: 40, height: 46, rx: 12, part: 'accent' },
];
/** The antenna ball, drawn after the antenna (index 1) as in the original artwork. */
const ANTENNA = { cx: 256, cy: 94, r: 26 };

/** Robot head whose face is a mini kanban board. Same colors in both themes. */
export function Logo({ size = 28, wordmark = false }: LogoProps) {
  const [background, antenna, ...rest] = RECTS;
  const rect = (shape: (typeof RECTS)[number] | undefined, key: number) =>
    shape && (
      <rect
        key={key}
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        rx={shape.rx}
        className={styles[shape.part]}
      />
    );

  const mark = (
    <svg className={styles.mark} width={size} height={size} viewBox={VIEW_BOX} aria-hidden focusable={false}>
      {rect(background, 0)}
      {rect(antenna, 1)}
      <circle cx={ANTENNA.cx} cy={ANTENNA.cy} r={ANTENNA.r} className={styles.accent} />
      {rest.map((shape, index) => rect(shape, index + 2))}
    </svg>
  );

  if (!wordmark) {
    return (
      <span role="img" aria-label={APP_NAME} className={styles.logo}>
        {mark}
      </span>
    );
  }
  return (
    <span className={styles.logo}>
      {mark}
      <span className={cx(styles.wordmark, size === 36 && styles.large)}>{APP_NAME}</span>
    </span>
  );
}
