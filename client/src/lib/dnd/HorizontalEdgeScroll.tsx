import { useDndMonitor, type ClientRect } from '@dnd-kit/core';
import { useEffect, useRef, type RefObject } from 'react';
import { useDirection } from '@/i18n';
import { edgeScrollStep } from './sensors';

interface HorizontalEdgeScrollProps {
  /** The element that scrolls sideways (the board's column strip). */
  scroller: RefObject<HTMLElement | null>;
}

/**
 * RTL only: scrolls `scroller` while a dragged item is near its left or right edge — what
 * dnd-kit's auto-scroll does in LTR but can't in RTL (see `useDragAutoScroll`). Render it inside
 * the `DndContext`. It keeps scrolling while the pointer rests at the edge (one step per frame)
 * and stops on drop or cancel. Renders nothing.
 */
export function HorizontalEdgeScroll({ scroller }: HorizontalEdgeScrollProps) {
  const rtl = useDirection() === 'rtl';
  const dragged = useRef<ClientRect | null>(null);
  const frame = useRef(0);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    dragged.current = null;
  };

  const tick = () => {
    const element = scroller.current;
    const rect = dragged.current;
    if (!element || !rect) {
      frame.current = 0;
      return;
    }
    const step = edgeScrollStep(rect, element.getBoundingClientRect());
    if (step !== 0) element.scrollBy({ left: step });
    frame.current = requestAnimationFrame(tick);
  };

  useDndMonitor({
    onDragMove: ({ active }) => {
      if (!rtl) return;
      dragged.current = active.rect.current.translated;
      if (frame.current === 0) frame.current = requestAnimationFrame(tick);
    },
    onDragEnd: stop,
    onDragCancel: stop,
  });

  // Unmounting mid-drag (route change) must not leave a frame loop behind.
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  return null;
}
