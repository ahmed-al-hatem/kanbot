import { describe, expect, it } from 'vitest';
import { icons } from '@/components/Icon/icons';
import { TOAST_ICONS, type ToastIconName } from './toastIconPaths';

describe('toast icons', () => {
  it('are the same glyphs as the generated icon map', () => {
    for (const name of Object.keys(TOAST_ICONS) as ToastIconName[]) {
      expect(TOAST_ICONS[name], name).toEqual(icons[name]);
    }
  });
});
