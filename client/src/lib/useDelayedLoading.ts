import { useEffect, useRef, useState } from 'react';

interface DelayedLoadingOptions {
  /** Don't show anything for loads shorter than this (ms). */
  delay?: number;
  /** Once shown, keep it at least this long (ms), so it never flickers. */
  minDuration?: number;
}

/**
 * Skeleton timing from DESIGN §11 (plan §5.5): appears after 150ms of loading and, once
 * shown, stays at least 300ms. Returns whether the skeleton should be visible.
 */
export function useDelayedLoading(
  loading: boolean,
  { delay = 150, minDuration = 300 }: DelayedLoadingOptions = {},
) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (loading) {
      if (visible) return;
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, delay);
      return () => {
        clearTimeout(timer);
      };
    }
    if (!visible) return;
    const timer = setTimeout(
      () => {
        setVisible(false);
      },
      Math.max(0, shownAt.current + minDuration - Date.now()),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [loading, visible, delay, minDuration]);

  return visible;
}
