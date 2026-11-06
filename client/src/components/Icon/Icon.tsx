import type { SVGProps } from 'react';
import { cx } from '@/lib/cx';
import { icons, type IconName, type IconPath } from './icons';

export type IconSize = 12 | 16 | 20 | 24;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox' | 'fill'> {
  name: IconName;
  /** 16 by default, 12 in chips and meta, 20–24 in empty states (DESIGN §5.1). */
  size?: IconSize;
  /**
   * Only for an icon that stands alone and carries meaning. Without it the icon is
   * decorative (`aria-hidden`), which is right whenever text sits next to it.
   */
  label?: string;
}

/**
 * Icons that point along the reading direction and mirror in RTL (`.flip`, styles/base.css) — the
 * ones the Arabic canvas draws with `kb-flip`: arrows (back, "move to"), send, log out and the
 * sprint glyph (a looping arrow). Everything else (check, plus, search, clock, chevron-down,
 * refresh…) reads the same both ways. The backlog's collapse chevron turns through `--dir` instead.
 */
const DIRECTIONAL_ICONS: ReadonlySet<IconName> = new Set<IconName>([
  'arrow-left',
  'arrow-right',
  'send',
  'log-out',
  'sprint',
]);

const FLIP = 'flip';

/** Atlaskit glyph rendered from the path map; takes the text color of its parent. */
export function Icon({ name, size = 16, label, className, ...rest }: IconProps) {
  const paths: readonly IconPath[] = icons[name];
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const classes = cx(DIRECTIONAL_ICONS.has(name) && FLIP, className) || undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      focusable="false"
      className={classes}
      {...a11y}
      {...rest}
    >
      {paths.map((path) => (
        <path
          key={path.d}
          fill="currentColor"
          d={path.d}
          fillRule={path.evenOdd ? 'evenodd' : undefined}
          clipRule={path.evenOdd ? 'evenodd' : undefined}
        />
      ))}
    </svg>
  );
}

export type { IconName };
