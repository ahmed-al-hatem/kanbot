import type { SVGProps } from 'react';
import type { IconPath } from '@/components/Icon/icons';
import { TOAST_ICONS, type ToastIconName } from './toastIconPaths';

interface ToastIconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox' | 'fill'> {
  name: ToastIconName;
  size?: 12 | 16;
}

/** Same markup as `<Icon>` (decorative, 16×16 viewBox, currentColor). */
export function ToastIcon({ name, size = 16, ...rest }: ToastIconProps) {
  const paths: readonly IconPath[] = TOAST_ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      focusable="false"
      aria-hidden="true"
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
