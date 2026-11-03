import type { ReactNode } from 'react';

/** Text for screen readers only (the `.visually-hidden` utility in base.css). */
export function VisuallyHidden({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <span id={id} className="visually-hidden">
      {children}
    </span>
  );
}
