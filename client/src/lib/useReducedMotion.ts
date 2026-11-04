import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function media(): MediaQueryList | null {
  // jsdom (the unit tests) has the property but not a working function, though the DOM types
  // say it always exists, so check that it is callable.
  return typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
}

function subscribe(onChange: () => void) {
  const list = media();
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

/** `prefers-reduced-motion: reduce`, live. CSS handles most motion; JS animations (dnd-kit) ask here. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => media()?.matches ?? false);
}
