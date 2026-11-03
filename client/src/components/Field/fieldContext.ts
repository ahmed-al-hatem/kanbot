import { createContext, use } from 'react';

export interface FieldContextValue {
  /** id of the control, so the `<label htmlFor>` points at it. */
  id: string;
  /** ids of the error and help text, for `aria-describedby`. */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

interface ControlA11yProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  'aria-required'?: boolean | 'true' | 'false';
}

function joinIds(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(' ') || undefined;
}

/**
 * Wires a control to the surrounding `<Field>`: id, `aria-describedby`, `aria-invalid`
 * and `aria-required`. Explicit props win. Outside a Field the props pass through.
 */
export function useFieldControl<P extends ControlA11yProps>(props: P): P {
  const field = use(FieldContext);
  if (!field) return props;
  return {
    ...props,
    id: props.id ?? field.id,
    'aria-describedby': joinIds(field.describedBy, props['aria-describedby']),
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
    'aria-required': props['aria-required'] ?? (field.required || undefined),
  };
}
