import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAnnouncer } from '@/stores/announcer';
import { expectNoAxeViolations } from '@/test/axe';
import { Checkbox } from './Checkbox';
import { Field } from './Field';
import { Input, Textarea } from './Input';
import { DateInput, Select } from './Select';
import { TagInput } from './TagInput';

describe('Field', () => {
  it('labels the control and marks it required without the asterisk in the name', () => {
    render(
      <Field label="Project name" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Project name' });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('links the help text with aria-describedby', () => {
    render(
      <Field label="Key" help="2–6 letters">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Key' });
    expect(input).toHaveAccessibleDescription('2–6 letters');
    expect(input.getAttribute('aria-describedby')).toMatch(/-help$/);
  });

  it('sets aria-invalid and describes the control with the error, replacing the help', () => {
    render(
      <Field label="Email" help="We never share it" error="Enter a valid email address">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(screen.queryByText('We never share it')).not.toBeInTheDocument();
  });

  it('clears aria-invalid and goes back to the help once the error is fixed', () => {
    const { rerender } = render(
      <Field label="Email" help="We never share it" error="Required">
        <Input />
      </Field>,
    );
    rerender(
      <Field label="Email" help="We never share it">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('We never share it');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps an explicit aria-describedby next to its own', () => {
    render(
      <>
        <p id="extra">Shown on the card</p>
        <Field label="Title" error="Too long">
          <Input aria-describedby="extra" />
        </Field>
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveAccessibleDescription(
      'Too long Shown on the card',
    );
  });

  it.each<[string, ReactNode, string]>([
    ['Textarea', <Textarea key="t" />, 'textbox'],
    [
      'Select',
      <Select key="s">
        <option>High</option>
      </Select>,
      'combobox',
    ],
    ['TagInput', <TagInput key="g" value={[]} onChange={vi.fn()} />, 'textbox'],
  ])('wires %s the same way', (_name, control, role) => {
    render(
      <Field label="Control" error="Fix this">
        {control}
      </Field>,
    );
    const element = screen.getByRole(role, { name: 'Control' });
    expect(element).toHaveAttribute('aria-invalid', 'true');
    expect(element).toHaveAccessibleDescription('Fix this');
  });

  it('wires DateInput the same way', () => {
    const { container } = render(
      <Field label="Due date" error="This todo is overdue">
        <DateInput />
      </Field>,
    );
    const input = container.querySelector('input[type="date"]');
    expect(input).toHaveAccessibleName('Due date');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('This todo is overdue');
  });

  it('has no axe violations with help, error, select, date and checkbox', async () => {
    const { container } = render(
      <form>
        <Field label="Name" required help="Shown on the board">
          <Input />
        </Field>
        <Field label="Email" error="Enter a valid email address">
          <Input type="email" />
        </Field>
        <Field label="Priority">
          <Select defaultValue="high">
            <option value="high">High</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Due date">
          <DateInput />
        </Field>
        <Field label="Labels">
          <TagInput value={['api']} onChange={vi.fn()} />
        </Field>
        <Checkbox label="Generate an AI summary" description="Uses the sprint's todos." />
      </form>,
    );
    await expectNoAxeViolations(container);
  });
});

function Labels({ initial = [] as string[] }) {
  const [labels, setLabels] = useState(initial);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        throw new Error('Enter in the tag input must not submit');
      }}
    >
      <Field label="Labels">
        <TagInput value={labels} onChange={setLabels} maxTags={3} />
      </Field>
    </form>
  );
}

describe('TagInput', () => {
  it('adds with Enter or a comma, trims, ignores duplicates, and announces', async () => {
    const user = userEvent.setup();
    render(<Labels />);
    const input = screen.getByRole('textbox', { name: 'Labels' });

    await user.type(input, '  frontend {Enter}api,');
    expect(screen.getByRole('button', { name: 'Remove label frontend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove label api' })).toBeInTheDocument();
    expect(useAnnouncer.getState().message).toBe('Label api added');

    await user.type(input, 'API{Enter}');
    expect(screen.getAllByRole('button', { name: /^Remove label/ })).toHaveLength(2);
    expect(input).toHaveValue('');
  });

  it('removes the last label with Backspace on an empty input', async () => {
    const user = userEvent.setup();
    render(<Labels initial={['frontend', 'api']} />);
    await user.type(screen.getByRole('textbox', { name: 'Labels' }), '{Backspace}');
    expect(screen.queryByRole('button', { name: 'Remove label api' })).not.toBeInTheDocument();
    expect(useAnnouncer.getState().message).toBe('Label api removed');
  });

  it('removes a label with its × button and returns focus to the input', async () => {
    const user = userEvent.setup();
    render(<Labels initial={['frontend', 'api']} />);
    await user.click(screen.getByRole('button', { name: 'Remove label frontend' }));
    expect(screen.queryByText('frontend')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Labels' })).toHaveFocus();
  });

  it('stops at maxTags', async () => {
    const user = userEvent.setup();
    render(<Labels initial={['a', 'b', 'c']} />);
    await user.type(screen.getByRole('textbox', { name: 'Labels' }), 'd{Enter}');
    expect(screen.queryByText('d')).not.toBeInTheDocument();
    expect(useAnnouncer.getState().message).toBe('You can add up to 3 labels');
  });
});
