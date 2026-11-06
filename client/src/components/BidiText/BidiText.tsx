import { Fragment, type ReactNode } from 'react';
import { bidiParts, type BidiPart } from '@/i18n/bidi';

function render(parts: readonly BidiPart[]): ReactNode {
  return parts.map((part, index) =>
    typeof part === 'string' ? (
      <Fragment key={index}>{part}</Fragment>
    ) : (
      <bdi key={index}>{render(part.isolate)}</bdi>
    ),
  );
}

/**
 * A dictionary sentence whose user and server values are marked with `isolate()` (i18n/bidi.ts),
 * rendered with each value in a `<bdi>`: «<bdi>KAN-12</bdi> نُقل إلى <bdi>Done</bdi>». A string
 * without marks (all of English) renders as it is, and any other node passes through, so the
 * shared components that show sentences (toasts, dialog and empty-state titles and
 * descriptions) wrap whatever they are given.
 */
export function BidiText({ children }: { children: ReactNode }) {
  return typeof children === 'string' ? <>{render(bidiParts(children))}</> : <>{children}</>;
}
