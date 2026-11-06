import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/Button/Button';
import { Field } from '@/components/Field/Field';
import { Input } from '@/components/Field/Input';
import { expectNoAxeViolations } from '@/test/axe';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';

function ProjectDialog({ autofocus = true }: { autofocus?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        New project
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Create project"
        footer={
          <>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary">Create project</Button>
          </>
        }
      >
        <Field label="Project name">
          <Input data-autofocus={autofocus || undefined} />
        </Field>
      </Dialog>
    </>
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  const opener = screen.getByRole('button', { name: 'New project' });
  await user.click(opener);
  return { opener, dialog: await screen.findByRole('dialog', { name: 'Create project' }) };
}

describe('Dialog', () => {
  it('is a labelled modal dialog and focuses [data-autofocus] on open', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog />);
    const { dialog } = await openDialog(user);

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Project name' })).toHaveFocus();
    });
  });

  it('focuses the panel itself when nothing is marked [data-autofocus]', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog autofocus={false} />);
    const { dialog } = await openDialog(user);
    await waitFor(() => {
      expect(dialog).toHaveFocus();
    });
  });

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog />);
    const { dialog } = await openDialog(user);

    // Close, field, Cancel, Create: go round more than once in both directions.
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Esc and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog />);
    const { opener } = await openDialog(user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  it('closes from the × button and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog />);
    const { opener } = await openDialog(user);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  it('lets a parent veto closing (unsaved changes) because it is controlled', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Todo details">
        <p>Body</p>
      </Dialog>,
    );
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog', { name: 'Todo details' })).toBeInTheDocument();
  });

  it('has no axe violations when open', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog />);
    const { dialog } = await openDialog(user);
    await expectNoAxeViolations(dialog);
  });
});

function DeleteProject({
  onConfirm,
  pending = false,
}: {
  onConfirm: () => void;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Delete project
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete Kanbot?"
        description="Its todos and sprints will be deleted too."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        pending={pending}
        onConfirm={onConfirm}
      />
    </>
  );
}

describe('ConfirmDialog', () => {
  it('is an alertdialog that focuses Cancel, and confirms on click', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteProject onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Kanbot?' });
    expect(dialog).toHaveAccessibleDescription('Its todos and sprints will be deleted too.');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await expectNoAxeViolations(dialog);
  });

  it('closes on Esc and restores focus to the opener', async () => {
    const user = userEvent.setup();
    render(<DeleteProject onConfirm={vi.fn()} />);
    const opener = screen.getByRole('button', { name: 'Delete project' });
    await user.click(opener);
    await screen.findByRole('alertdialog');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  it('cannot be dismissed while the action is pending', async () => {
    const user = userEvent.setup();
    render(<DeleteProject onConfirm={vi.fn()} pending />);
    await user.click(screen.getByRole('button', { name: 'Delete project' }));
    await screen.findByRole('alertdialog');

    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deleting…' })).toHaveAttribute('aria-busy', 'true');
  });
});
