import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { Field } from '@/components/Field/Field';
import { DateInput } from '@/components/Field/Select';
import { useStartSprint } from '@/hooks/useSprints';
import { applyServerErrors, onInvalidSubmit } from '@/lib/formErrors';
import { addDays, todayIso, todosAndPoints } from '@/lib/format';
import type { Sprint } from '@/types/api';
import { durationHint, SPRINT_LENGTH_DAYS, startSprintSchema, type StartSprintValues } from './sprintForm';
import styles from './Sprints.module.css';

interface StartSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  sprint: Sprint;
  /** Shown in the dialog: "3 todos · 8 pts". */
  todoCount: number;
  points: number;
  onStarted: (sprint: Sprint) => void;
}

/**
 * Start sprint (SPR-3, plan §2 #9): a small dialog in the Create-sprint style with the start
 * date (today) and the end date (+14 days). A 409 (another sprint was started meanwhile, e.g. in
 * another tab) shows the server's message above the fields.
 */
export function StartSprintDialog({ open, onOpenChange, projectId, sprint, todoCount, points, onStarted }: StartSprintDialogProps) {
  const formId = useId();
  const start = useStartSprint(projectId);
  const [formError, setFormError] = useState<string | null>(null);
  const [today] = useState(() => todayIso());

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<StartSprintValues>({
    resolver: zodResolver(startSprintSchema),
    mode: 'onTouched',
    defaultValues: { startDate: today, endDate: addDays(today, SPRINT_LENGTH_DAYS) },
  });
  const [startDate, endDate] = useWatch({ control, name: ['startDate', 'endDate'] });
  const hint = durationHint(startDate, endDate);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    start.mutate(
      { sprintId: sprint.id, body: values },
      {
        onSuccess: onStarted,
        onError: (error) => {
          if (applyServerErrors(error, setError, ['startDate', 'endDate'])) return;
          setFormError(isApiError(error) ? error.message : 'Something went wrong. Please try again.');
        },
      },
    );
  }, onInvalidSubmit);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!start.isPending) onOpenChange(next);
      }}
      title={`Start ${sprint.name}`}
      size="sprint"
      description={
        <>
          {todosAndPoints(todoCount, points)}
          {sprint.goal && <> · {sprint.goal}</>}
        </>
      }
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
          <Button type="submit" form={formId} variant="primary" loading={start.isPending} loadingText="Starting…">
            Start sprint
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
        <div className={styles.dates}>
          <Field label="Start date" required error={errors.startDate?.message}>
            <DateInput data-autofocus {...register('startDate', { deps: ['endDate'] })} />
          </Field>
          <Field label="End date" required error={errors.endDate?.message} help={hint ?? undefined}>
            <DateInput {...register('endDate')} />
          </Field>
        </div>
        <p className={styles.note}>Its todos move onto the Active Sprint board, where you can track them until you complete it.</p>
      </form>
    </Dialog>
  );
}
