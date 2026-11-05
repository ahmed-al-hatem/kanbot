import type { IconPath } from '@/components/Icon/icons';

/**
 * The four glyphs the Toaster needs, copied from the generated `components/Icon/icons.ts`.
 * The Toaster is in the startup bundle, and importing `<Icon>` there would ship the whole
 * icon map (~3 KB gz) to the first load. `toastIcons.test.ts` fails if these drift from the
 * generated map, so re-run it after `npm run icons`.
 */
export const TOAST_ICONS = {
  cross: [
    {
      d: 'M13.53 3.53 9.06 8l4.47 4.47-1.06 1.06L8 9.06l-4.47 4.47-1.06-1.06L6.94 8 2.47 3.53l1.06-1.06L8 6.94l4.47-4.47z',
    },
  ],
  'check-circle': [
    {
      d: 'M14.5 8a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0m-2.174-2.52-5 6a.75.75 0 0 1-1.152 0l-2.5-3 1.152-.96L6.75 9.828l4.424-5.308zM16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0',
    },
  ],
  lightbulb: [
    {
      d: 'M10 12.5H6V14a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm-2-11c-3.022 0-4.935 3.243-3.473 5.888L5.535 9.21c.303.548.463 1.164.465 1.79h4a3.7 3.7 0 0 1 .465-1.79l1.008-1.822C12.935 4.743 11.022 1.5 8 1.5M11.5 14a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-2.988a2.2 2.2 0 0 0-.277-1.075L3.215 8.114C1.2 4.47 3.835 0 8 0c4.164 0 6.8 4.47 4.785 8.114l-1.008 1.823a2.2 2.2 0 0 0-.277 1.075z',
    },
  ],
  'status-error': [
    {
      d: 'M6.586.603a2 2 0 0 1 2.828 0l5.983 5.983a2 2 0 0 1 0 2.828l-5.983 5.982a2 2 0 0 1-2.828 0L.604 9.414a2 2 0 0 1 0-2.828zM8 10.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2m-.75-6.5V9h1.5V3.75z',
      evenOdd: true,
    },
  ],
} satisfies Record<string, readonly IconPath[]>;

export type ToastIconName = keyof typeof TOAST_ICONS;
