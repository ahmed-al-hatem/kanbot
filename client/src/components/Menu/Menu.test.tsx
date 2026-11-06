import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from '@/components/Button/Button';
import { expectNoAxeViolations } from '@/test/axe';
import { Menu, MenuItem, MenuSeparator } from './Menu';

function RowMenu({ onDelete = vi.fn() }: { onDelete?: () => void }) {
  return (
    <Menu
      label="KAN-12 actions"
      trigger={<IconButton icon="show-more-horizontal" aria-label="Actions for KAN-12" />}
    >
      <MenuItem icon="pencil">Open details</MenuItem>
      <MenuItem>Move to Sprint 4</MenuItem>
      <MenuItem disabled>Move to top</MenuItem>
      <MenuSeparator />
      <MenuItem icon="delete" tone="danger" onSelect={onDelete}>
        Delete
      </MenuItem>
    </Menu>
  );
}

const item = (name: string) => screen.getByRole('menuitem', { name });

describe('Menu', () => {
  it('opens from the keyboard with the first item focused', async () => {
    const user = userEvent.setup();
    render(<RowMenu />);
    const trigger = screen.getByRole('button', { name: 'Actions for KAN-12' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.tab();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('menu', { name: 'KAN-12 actions' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => {
      expect(item('Open details')).toHaveFocus();
    });
  });

  it('moves with ↑ ↓ Home End, skipping disabled items and wrapping', async () => {
    const user = userEvent.setup();
    render(<RowMenu />);
    await user.tab();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(item('Open details')).toHaveFocus();
    });

    await user.keyboard('{ArrowDown}');
    expect(item('Move to Sprint 4')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('Delete')).toHaveFocus(); // "Move to top" is disabled
    await user.keyboard('{ArrowDown}');
    expect(item('Open details')).toHaveFocus(); // wraps
    await user.keyboard('{End}');
    expect(item('Delete')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('Open details')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(item('Delete')).toHaveFocus();
  });

  it('closes on Esc and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<RowMenu />);
    const trigger = screen.getByRole('button', { name: 'Actions for KAN-12' });
    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByRole('menu');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('runs the item on Enter, closes and refocuses the trigger', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<RowMenu onDelete={onDelete} />);
    const trigger = screen.getByRole('button', { name: 'Actions for KAN-12' });
    await user.tab();
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(item('Open details')).toHaveFocus();
    });

    await user.keyboard('{End}{Enter}');
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });

  it('focuses the first item when opened with the mouse too (DESIGN §10.3)', async () => {
    const user = userEvent.setup();
    render(<RowMenu />);
    await user.click(screen.getByRole('button', { name: 'Actions for KAN-12' }));
    await waitFor(() => {
      expect(item('Open details')).toHaveFocus();
    });
  });

  it('has no axe violations when open', async () => {
    const user = userEvent.setup();
    render(<RowMenu />);
    await user.tab();
    await user.keyboard('{Enter}');
    await expectNoAxeViolations(await screen.findByRole('menu'));
  });
});
