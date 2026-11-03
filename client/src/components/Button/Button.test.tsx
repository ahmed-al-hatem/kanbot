import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SubmitEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoAxeViolations } from '@/test/axe';
import { Button, IconButton } from './Button';

describe('Button', () => {
  it('is a type="button" by default so it never submits a form by accident', () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button');
  });

  it('calls onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  describe('loading', () => {
    it('shows the verb, is busy and aria-disabled, and ignores clicks', async () => {
      const onClick = vi.fn();
      render(
        <Button variant="primary" loading loadingText="Saving…" onClick={onClick}>
          Save changes
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Saving…' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('keeps the idle label in the layout (hidden) so the width does not change', () => {
      const { rerender } = render(
        <Button loading={false} loadingText="Saving…">
          Save changes
        </Button>,
      );
      // Both labels are always rendered in the same grid cell; only visibility flips.
      expect(screen.getByRole('button', { name: 'Save changes' })).toHaveTextContent('Save changesSaving…');

      rerender(
        <Button loading loadingText="Saving…">
          Save changes
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Saving…' });
      expect(button).toHaveTextContent('Save changesSaving…');
    });

    it('stays focusable (aria-disabled, not disabled) so keyboard focus is not lost', async () => {
      render(
        <Button loading loadingText="Saving…">
          Save
        </Button>,
      );
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'Saving…' })).toHaveFocus();
    });

    it('blocks the implicit submit when Enter is pressed in a field', async () => {
      const onSubmit = vi.fn((event: SubmitEvent) => {
        event.preventDefault();
      });
      render(
        <form onSubmit={onSubmit}>
          <input aria-label="Name" />
          <Button type="submit" loading loadingText="Saving…">
            Save
          </Button>
        </form>,
      );
      await userEvent.type(screen.getByRole('textbox', { name: 'Name' }), 'Kanbot{Enter}');
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('keeps its accessible name while loading without a verb', () => {
      render(
        <Button variant="ai" loading>
          Generate
        </Button>,
      );
      expect(screen.getByRole('button', { name: 'Generate' })).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('disabled', () => {
    it('is natively disabled and ignores clicks', async () => {
      const onClick = vi.fn();
      render(
        <Button disabled onClick={onClick}>
          Start sprint
        </Button>,
      );
      const button = screen.getByRole('button', { name: 'Start sprint' });
      expect(button).toBeDisabled();
      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  it('has no axe violations in any variant or state', async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="neutral">Neutral</Button>
        <Button variant="subtle">Subtle</Button>
        <Button variant="ai">Ask AI</Button>
        <Button variant="danger" icon="delete">
          Delete
        </Button>
        <Button disabled>Disabled</Button>
        <Button loading loadingText="Saving…">
          Save
        </Button>
        <IconButton icon="cross" aria-label="Close" />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});

describe('IconButton', () => {
  it('is named by its aria-label', () => {
    render(<IconButton icon="show-more-horizontal" aria-label="Actions for KAN-12" />);
    expect(screen.getByRole('button', { name: 'Actions for KAN-12' })).toBeInTheDocument();
  });

  it('requires aria-label at the type level', () => {
    // @ts-expect-error — an icon-only button without aria-label must not compile.
    const element = <IconButton icon="cross" />;
    expect(element).toBeTruthy();
  });
});
