import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { Icon } from './Icon';

describe('Icon', () => {
  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(<Icon name="add" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '16');
  });

  it('is an image with an accessible name when labelled', () => {
    render(<Icon name="ai-sparkle" label="AI" size={12} />);
    expect(screen.getByRole('img', { name: 'AI' })).toHaveAttribute('width', '12');
  });
});

describe('TypeIcon', () => {
  it.each([
    ['task', 'Task'],
    ['story', 'Story'],
    ['bug', 'Bug'],
  ] as const)('labels %s so color is not the only signal', (type, label) => {
    render(<TypeIcon type={type} />);
    expect(screen.getByRole('img', { name: label })).toBeInTheDocument();
  });
});
