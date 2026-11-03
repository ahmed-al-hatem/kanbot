import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { announce } from '@/stores/announcer';
import { toast, useToast } from '@/stores/toast';
import { expectNoAxeViolations } from '@/test/axe';
import { LiveRegion } from './LiveRegion';
import { Toaster } from './Toaster';

describe('Toaster (Flag)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has no axe violations', async () => {
    const { container } = render(<Toaster />);
    act(() => {
      toast.success('KAN-12 created', { action: { label: 'Undo', onClick: () => undefined } });
    });
    await expectNoAxeViolations(container);
  });

  it('announces the toast in an always-mounted status region and hides it after 3.2s', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    const region = screen.getByRole('status');

    act(() => {
      toast.success('KAN-12 created');
    });
    expect(region).toHaveTextContent('KAN-12 created');

    act(() => {
      vi.advanceTimersByTime(3200);
    });
    // Still there while kbFlagOut plays.
    expect(region).toHaveTextContent('KAN-12 created');
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(region).toBeEmptyDOMElement();
    expect(useToast.getState().toast).toBeNull();
  });

  it('keeps a toast with an action for 5s and runs the action', () => {
    vi.useFakeTimers();
    const onUndo = vi.fn();
    render(<Toaster />);

    act(() => {
      toast.info('KAN-3 moved to Sprint 2', { action: { label: 'Undo', onClick: onUndo } });
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    const undo = screen.getByRole('button', { name: 'Undo' });
    act(() => {
      undo.click();
    });
    expect(onUndo).toHaveBeenCalledOnce();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(useToast.getState().toast).toBeNull();
  });

  it('pauses while hovered and closes from Dismiss', () => {
    vi.useFakeTimers();
    render(<Toaster />);
    act(() => {
      toast.error("Couldn't move KAN-12");
    });

    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.mouseEnter(dismiss.parentElement!);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("Couldn't move KAN-12")).toBeInTheDocument();

    act(() => {
      dismiss.click();
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText("Couldn't move KAN-12")).not.toBeInTheDocument();
  });
});

describe('LiveRegion', () => {
  it('puts announcements in the polite or assertive region', () => {
    render(<LiveRegion />);

    act(() => {
      announce('KAN-21 moved to In Progress, position 2 of 3');
    });
    expect(screen.getByTestId('live-polite')).toHaveTextContent('KAN-21 moved to In Progress, position 2 of 3');
    expect(screen.getByTestId('live-polite')).toHaveAttribute('aria-live', 'polite');

    act(() => {
      announce('Connection lost', 'assertive');
    });
    expect(screen.getByTestId('live-assertive')).toHaveTextContent('Connection lost');
    expect(screen.getByTestId('live-polite')).toBeEmptyDOMElement();
  });
});
