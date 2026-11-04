import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { Field } from '@/components/Field/Field';
import { Input, Textarea } from '@/components/Field/Input';
import { DateInput } from '@/components/Field/Select';
import { useCreateSprint, useUpdateSprint } from '@/hooks/useSprints';
import { applyServerErrors, onInvalidSubmit } from '@/lib/formErrors';
import { addDays } from '@/lib/format';
import type { Sprint, UpdateSprintRequest } from '@/types/api';
import {
  createDefaults,
  durationHint,
  editDefaults,
  SPRINT_GOAL_MAX,
  SPRINT_LENGTH_DAYS,
  SPRINT_NAME_MAX,
  sprintFormSchema,
  type SprintFormValues,
} from './sprintForm';
import styles from './Sprints.module.css';

const FIELDS = ['name', 'startDate', 'endDate', 'goal'] as const;

interface SprintFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Edit this sprint; create a planned sprint when omitted. */
  sprint?: Sprint | null;
  /** The project's sprints, for the "Sprint N" name and the start-after-the-last-one default. */
  sprints: readonly Sprint[];
  /** After the request succeeds; the parent closes the dialog and toasts. */
  onSaved: (sprint: Sprint, mode: 'create' | 'edit') => void;
}

/**
 * Create / edit sprint (DESIGN §9 13, SPR-1, SPR-2), 520px. Name defaults to "Sprint N"; a new
 * sprint starts the day after the last one ends and lasts two weeks (the end follows the start
 * until it is edited); a hint gives the length; goal ≤ 300 (the API limit, plan §2 #12). Dates
 * are optional, but the end can't come before the start. Mount it fresh for every open (`key`).
 */
export function SprintFormDialog({ open, onOpenChange, projectId, sprint, sprints, onSaved }: SprintFormDialogProps) {
  const formId = useId();
  const create = useCreateSprint(projectId);
  const update = useUpdateSprint(projectId);
  const saving = create.isPending || update.isPending;
  const [formError, setFormError] = useState<string | null>(null);
  const [initial] = useState(() => (sprint ? editDefaults(sprint) : createDefaults(sprints)));

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    formState: { errors, dirtyFields, touchedFields },
  } = useForm<SprintFormValues>({
    resolver: zodResolver(sprintFormSchema),
    mode: 'onTouched',
    defaultValues: initial,
  });
  const [startDate, endDate] = useWatch({ control, name: ['startDate', 'endDate'] });
  const hint = durationHint(startDate, endDate);

  const startField = register('startDate', {
    // Re-checks the end against the new start; a new sprint keeps its two weeks until the
    // end date is edited by hand.
    deps: ['endDate'],
    onChange: (event: { target: { value: string } }) => {
      const value = event.target.value;
      if (!sprint && value && !dirtyFields.endDate) {
        setValue('endDate', addDays(value, SPRINT_LENGTH_DAYS), { shouldValidate: Boolean(touchedFields.endDate) });
      }
    },
  });

  const onError = (error: unknown) => {
    if (applyServerErrors(error, setError, FIELDS)) return;
    setFormError(isApiError(error) ? error.message : 'Something went wrong. Please try again.');
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const body = {
      name: values.name,
      goal: values.goal,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
    };
    if (sprint) {
      // Only what changed, like Todo details: a concurrent edit to another field survives.
      const changed: UpdateSprintRequest = {};
      if (body.name !== sprint.name) changed.name = body.name;
      if (body.goal !== sprint.goal) changed.goal = body.goal;
      if (body.startDate !== sprint.startDate) changed.startDate = body.startDate;
      if (body.endDate !== sprint.endDate) changed.endDate = body.endDate;
      update.mutate(
        { sprintId: sprint.id, body: changed },
        {
          onSuccess: (saved) => {
            onSaved(saved, 'edit');
          },
          onError,
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: (saved) => {
          onSaved(saved, 'create');
        },
        onError,
      });
    }
  }, onInvalidSubmit);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
      title={sprint ? `Edit ${sprint.name}` : 'Create sprint'}
      size="sprint"
      footer={
        <>
          <Button
            variant="subtle"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={saving} loadingText="Saving…">
            {sprint ? 'Save sprint' : 'Create sprint'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {formError && (
          <Banner tone="danger" layout="inline">
            {formError}
          </Banner>
        )}

        <Field label="Sprint name" required error={errors.name?.message}>
          <Input data-autofocus maxLength={SPRINT_NAME_MAX} autoComplete="off" {...register('name')} />
        </Field>

        <div className={styles.dates}>
          <Field label="Start date" error={errors.startDate?.message}>
            <DateInput {...startField} />
          </Field>
          <Field label="End date" error={errors.endDate?.message} help={hint ?? undefined}>
            <DateInput {...register('endDate')} />
          </Field>
        </div>

        <Field label="Sprint goal" error={errors.goal?.message} help={`Optional · up to ${SPRINT_GOAL_MAX} characters`}>
          <Textarea rows={3} placeholder="What should this sprint deliver?" {...register('goal')} />
        </Field>
      </form>
    </Dialog>
  );
}
