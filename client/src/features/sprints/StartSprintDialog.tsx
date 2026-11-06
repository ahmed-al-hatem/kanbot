import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { Field } from '@/components/Field/Field';
import { DateInput } from '@/components/Field/Select';
import { useStartSprint } from '@/hooks/useSprints';
import { useFormat, useT } from '@/i18n';
import { errorMessage } from '@/i18n/errors';
import { addDays, todayIso } from '@/lib/dates';
import { applyLocalizedServerErrors, onInvalidSubmit, useLocalizedErrors } from '@/lib/formErrors';
import type { Sprint } from '@/types/api';
import {
  durationHint,
  SPRINT_LENGTH_DAYS,
  startSprintSchema,
  type StartSprintValues,
} from './sprintForm';
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
 * another tab) shows above the fields: the server's message in English, the meaning in Arabic.
 */
export function StartSprintDialog({
  open,
  onOpenChange,
  projectId,
  sprint,
  todoCount,
  points,
  onStarted,
}: StartSprintDialogProps) {
  const t = useT();
  const format = useFormat();
  const { form, start: copy } = t.sprints;
  const formId = useId();
  const start = useStartSprint(projectId);
  /** The failed request behind the banner (null: no banner); its text is read at render. */
  const [formError, setFormError] = useState<unknown>(null);
  const [today] = useState(() => todayIso());
  const schema = useMemo(() => startSprintSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    trigger,
    control,
    formState: { errors },
  } = useForm<StartSprintValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { startDate: today, endDate: addDays(today, SPRINT_LENGTH_DAYS) },
  });
  const setServerError = useLocalizedErrors({ errors, setError, trigger });
  const [startDate, endDate] = useWatch({ control, name: ['startDate', 'endDate'] });
  const hint = durationHint(startDate, endDate, format, t);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    start.mutate(
      { sprintId: sprint.id, body: values },
      {
        onSuccess: onStarted,
        onError: (error) => {
          if (applyLocalizedServerErrors(error, setServerError, ['startDate', 'endDate'])) return;
          setFormError(error);
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
      title={copy.title(sprint.name)}
      size="sprint"
      description={copy.summary(format.todosAndPoints(todoCount, points), sprint.goal)}
      footer={
        <>
          <Button
            variant="subtle"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={start.isPending}
            loadingText={copy.starting}
          >
            {copy.submit}
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
        {formError !== null && (
          <Banner tone="danger" layout="inline">
            {errorMessage(formError, t, { CONFLICT: copy.conflict, NOT_FOUND: t.sprints.notFound })}
          </Banner>
        )}
        <div className={styles.dates}>
          <Field label={form.startDate} required error={errors.startDate?.message}>
            <DateInput data-autofocus {...register('startDate', { deps: ['endDate'] })} />
          </Field>
          <Field
            label={form.endDate}
            required
            error={errors.endDate?.message}
            help={hint ?? undefined}
          >
            <DateInput {...register('endDate')} />
          </Field>
        </div>
        <p className={styles.note}>{copy.note}</p>
      </form>
    </Dialog>
  );
}
