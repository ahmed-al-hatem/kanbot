import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { LanguageNavItem } from '@/features/shell/LanguageNavItem';
import { useLocaleStore } from '@/stores/locale';
import { expectNoAxeViolations } from '@/test/axe';
import { preloadPages, renderApp } from '@/test/renderApp';
import { LanguageSwitcher } from './LanguageSwitcher';

beforeAll(async () => {
  await preloadPages();
  // Warm the Arabic chunk so the first switch isn't a cold transform.
  await import('@/i18n/messages/ar');
});

describe('LanguageSwitcher (auth top bar)', () => {
  it('is not rendered with the Arabic flag off', () => {
    const { container } = render(<LanguageSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows ع / EN with English pressed, and switches to Arabic in place', async () => {
    vi.stubEnv('VITE_FEATURE_AR', 'true');
    const user = userEvent.setup();
    const { container } = render(<LanguageSwitcher />);

    const group = screen.getByRole('group', { name: 'Language' });
    const arabic = screen.getByRole('button', { name: 'العربية' });
    const english = screen.getByRole('button', { name: 'English' });
    expect(group).toContainElement(arabic);
    expect(arabic).toHaveTextContent('ع');
    expect(arabic).toHaveAttribute('lang', 'ar');
    expect(english).toHaveAttribute('aria-pressed', 'true');
    expect(arabic).toHaveAttribute('aria-pressed', 'false');
    await expectNoAxeViolations(container);

    await user.click(arabic);

    expect(await screen.findByRole('group', { name: 'اللغة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'العربية' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(useLocaleStore.getState().locale).toBe('ar');
  });
});

describe('LanguageNavItem (sidebar)', () => {
  it('is not rendered with the Arabic flag off', () => {
    const { container } = render(<LanguageNavItem />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the other language by its own name and switches back and forth', async () => {
    vi.stubEnv('VITE_FEATURE_AR', 'true');
    const user = userEvent.setup();
    render(<LanguageNavItem />);

    const item = screen.getByRole('button', { name: 'العربية — Change language' });
    expect(item).toHaveTextContent('العربية');
    await user.click(item);

    const back = await screen.findByRole('button', { name: 'English — تغيير اللغة' });
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    await user.click(back);
    expect(
      await screen.findByRole('button', { name: 'العربية — Change language' }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
  });
});

describe('auth pages', () => {
  it('show the switcher next to the theme toggle only with the flag', async () => {
    const first = renderApp('/login');
    expect(
      await screen.findByRole('button', { name: /switch to (dark|light) theme/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Language' })).not.toBeInTheDocument();
    first.unmount();

    vi.stubEnv('VITE_FEATURE_AR', 'true');
    renderApp('/login');
    expect(await screen.findByRole('group', { name: 'Language' })).toBeInTheDocument();
  });
});
