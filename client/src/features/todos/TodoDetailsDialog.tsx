import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useBlocker, useParams, useSearchParams } from 'react-router';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { ConfirmBar } from '@/components/Banner/ConfirmBar';
import { Button } from '@/components/Button/Button';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { Dialog } from '@/components/Dialog/Dialog';
import { Field } from '@/components/Field/Field';
import { Input, Textarea } from '@/components/Field/Input';
import { DateInput, Select } from '@/components/Field/Select';
import { TagInput } from '@/components/Field/TagInput';
import { PageError } from '@/components/PageError/PageError';
import { Skeleton, SkeletonRegion } from '@/components/Skeleton/Skeleton';
import { useCurrentProject } from '@/hooks/useProjects';
import { useSprints } from '@/hooks/useSprints';
import { useTodo, useUpdateTodo } from '@/hooks/useTodos';
import { titleOf, useDocumentTitle } from '@/lib/documentTitle';
import { applyServerErrors, onInvalidSubmit } from '@/lib/formErrors';
import { formatTimestamp, overdueDays, plural } from '@/lib/format';
import { announce } from '@/stores/announcer';
import { useAssistant } from '@/stores/assistant';
import { toast } from '@/stores/toast';
import { TODO_STATUSES, type Sprint, type Todo } from '@/types/api';
import styles from './TodoDetailsDialog.module.css';
import { todoNeighbourFocus, todoOrPageFocus } from './todoFocus';
import { POINT_OPTIONS, PRIORITY_LABELS, PRIORITY_OPTIONS, STATUS_LABELS, TYPE_LABELS, TYPE_OPTIONS } from './todoMeta';
import {
  BACKLOG_VALUE,
  changedFields,
  NO_POINTS,
  todoFormSchema,
  toFormValues,
  toUpdateRequest,
  type TodoFormValues,
} from './todoSchema';
import { TypeIcon } from './TypeIcon';
import { useRemoveTodo } from './useRemoveTodo';

const FIELDS = [
  'title',
  'description',
  'type',
  'status',
  'priority',
  'storyPoints',
  'labels',
  'dueDate',
  'sprintId',
] as const satisfies readonly (keyof TodoFormValues)[];

const STATUS_HELP = 'Move it into the active sprint to set a status';
const COMPLETED_HELP = "Todos of a completed sprint can't be moved or change status";

/**
 * Opens Todo details for `?todo=<todoId>` (plan §2 #8). Mounted by the project layout, so the
 * backlog and (phase 6) the board share it, and a deep link opens it on any project page.
 * The last id stays mounted while the dialog animates out.
 */
export function TodoDetailsHost() {
  const [params, setParams] = useSearchParams();
  const todoId = params.get('todo');
  const [shownId, setShownId] = useState(todoId);
  // Adjusting state while rendering (not in an effect): a new `?todo=` swaps the dialog at once.
  if (todoId && todoId !== shownId) setShownId(todoId);

  const close = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete('todo');
        return next;
      },
      { replace: true },
    );
  };

  if (!shownId) return null;
  return <TodoDetailsDialog key={shownId} todoId={shownId} open={todoId === shownId} onClose={close} />;
}

interface TodoDetailsDialogProps {
  todoId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Loading and error states around the editor (DESIGN §11). A missing todo (404, or another
 * project's id) never gets here: the project layout shows the 404 page for it.
 */
function TodoDetailsDialog({ todoId, open, onClose }: TodoDetailsDialogProps) {
  const { projectId = '' } = useParams();
  const todo = useTodo(todoId);
  const sprints = useSprints(projectId);
  const { data: project } = useCurrentProject();
  const data = todo.data?.projectId === projectId ? todo.data : undefined;
  // A dialog-backed route: "KAN-12 · Kanbot Web · Kanbot" over the page's title while open.
  useDocumentTitle(open ? titleOf(data?.key ?? 'Todo details', project?.name) : null, 1);

  if (data) {
    return <TodoEditor todo={data} sprints={sprints.data} open={open} onClose={onClose} />;
  }

  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Todo details"
      size="todo"
      fallbackFocus={todoOrPageFocus(todoId)}
    >
      {todo.isError ? (
        <PageError
          page="this todo"
          error={todo.error}
          onRetry={() => {
            void todo.refetch();
          }}
          retrying={todo.isRefetching}
          backTo={false}
        />
      ) : (
        <SkeletonRegion label="todo" className={styles.skeleton}>
          <Skeleton blockSize={40} />
          <Skeleton blockSize={180} />
          <Skeleton blockSize={36} opacity={0.7} />
          <Skeleton blockSize={36} opacity={0.4} />
        </SkeletonRegion>
      )}
    </Dialog>
  );
}

interface TodoEditorProps {
  todo: Todo;
  sprints: Sprint[] | undefined;
  open: boolean;
  onClose: () => void;
}

/**
 * DESIGN §9 06 Todo details (BL-3, BL-4): every field, Save → `PATCH /todos/:id` with only the
 * changed fields, server `details[]` under their fields, a save-error bar with Retry that keeps
 * the edits, and the unsaved-changes guard on Esc, ×, the scrim, Cancel, in-app navigation
 * (`useBlocker`) and closing the tab (`beforeunload`).
 */
function TodoEditor({ todo, sprints, open, onClose }: TodoEditorProps) {
  const formId = useId();
  const update = useUpdateTodo();
  const removeTodo = useRemoveTodo();
  // The form starts from the todo as it was when the dialog opened; background refetches don't reset edits.
  const [initial] = useState(() => toFormValues(todo));
  const [askingDiscard, setAskingDiscard] = useState(false);
  const [askingDelete, setAskingDelete] = useState(false);
  // After a delete, where focus goes when the dialogs close: the row that opened us is gone.
  const [afterDelete, setAfterDelete] = useState<(() => HTMLElement | null) | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  // Set right before we close or navigate ourselves, so the guard lets that one through.
  const leaving = useRef(false);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    getValues,
    control,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(todoFormSchema),
    mode: 'onTouched',
    defaultValues: initial,
  });
  const type = useWatch({ control, name: 'type' });
  const status = useWatch({ control, name: 'status' });
  const sprintId = useWatch({ control, name: 'sprintId' });
  const dueDate = useWatch({ control, name: 'dueDate' });

  // `isDirty` drives what is shown; decisions read the form's values at the moment of the event,
  // because the render with the new `isDirty` can land just after a keystroke (Esc right away).
  const hasChanges = () => changedFields(getValues(), initial).length > 0;
  const guarding = open && isDirty;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      open &&
      !leaving.current &&
      hasChanges() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        new URLSearchParams(currentLocation.search).get('todo') !== new URLSearchParams(nextLocation.search).get('todo')),
  );
  const blocked = blocker.state === 'blocked';
  const confirming = askingDiscard || blocked;

  // Closing or reloading the tab with unsaved edits asks the browser's own question.
  useEffect(() => {
    if (!guarding) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [guarding]);

  const close = () => {
    leaving.current = true;
    onClose();
  };

  const requestClose = () => {
    if (!hasChanges()) {
      close();
      return;
    }
    setAskingDiscard(true);
    announce('You have unsaved changes');
  };

  const keepEditing = () => {
    setAskingDiscard(false);
    if (blocker.state === 'blocked') blocker.reset();
    setFocus('title');
  };

  const discard = () => {
    leaving.current = true;
    setAskingDiscard(false);
    if (blocker.state === 'blocked') blocker.proceed();
    else onClose();
  };

  const activeSprint = sprints?.find((sprint) => sprint.status === 'active');
  const currentSprint = todo.sprintId ? sprints?.find((sprint) => sprint.id === todo.sprintId) : undefined;
  const inCompletedSprint = currentSprint?.status === 'completed';
  const statusEnabled = !inCompletedSprint && Boolean(activeSprint) && sprintId === activeSprint?.id;
  const overdue = status === 'done' ? 0 : overdueDays(dueDate || null);

  const onSaveError = (error: unknown) => {
    if (applyServerErrors(error, setError, FIELDS)) return;
    setSaveError(error);
  };

  const onValid = (values: TodoFormValues) => {
    setSaveError(null);
    const body = toUpdateRequest(values, initial);
    if (Object.keys(body).length === 0) {
      close();
      return;
    }
    update.mutate(
      { todo, body },
      {
        onSuccess: (saved) => {
          toast.success(`${saved.key} saved`);
          close();
        },
        onError: onSaveError,
      },
    );
  };

  // handleSubmit is built here, in the event handler: built during render, the React Compiler
  // can't tell it won't run `onValid` (which writes the `leaving` ref) while rendering.
  const submit = () => {
    void handleSubmit(onValid, onInvalidSubmit)();
  };

  /**
   * Plan §9.4 "Improve this todo": opens the assistant over this dialog with a prompt about the
   * todo (its current, maybe unsaved, values) in the composer. Nothing is sent until the user
   * presses Send, and nothing changes here until they edit and save.
   */
  const improve = () => {
    useAssistant.getState().openWith(todo.projectId, improvePrompt(todo.key, getValues()));
  };

  const confirmDelete = () => {
    // Captured now, while the row and its neighbours are still on the page.
    const neighbour = todoNeighbourFocus(todo.id);
    setAfterDelete(() => neighbour);
    setAskingDelete(false);
    close();
    removeTodo(todo, neighbour);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      title={
        <span className={styles.title}>
          <TypeIcon type={type} decorative />
          {todo.key}
        </span>
      }
      headerMeta={`${TYPE_LABELS[type]} · created ${formatTimestamp(todo.createdAt)}`}
      size="todo"
      fallbackFocus={afterDelete ?? todoOrPageFocus(todo.id)}
      beforeFooter={
        (saveError !== null || confirming) && (
          <div className={styles.bars}>
            {saveError !== null && !confirming && (
              <Banner
                tone="danger"
                layout="inline"
                action={
                  <Button variant="subtle" size="sm" loading={update.isPending} loadingText="Retrying…" onClick={submit}>
                    Retry
                  </Button>
                }
              >
                {saveErrorText(todo.key, saveError)}
              </Banner>
            )}
            {confirming && (
              <ConfirmBar
                label="Unsaved changes"
                keepLabel="Keep editing"
                confirmLabel="Discard"
                onKeep={keepEditing}
                onConfirm={discard}
              >
                Discard your unsaved changes?
              </ConfirmBar>
            )}
          </div>
        )
      }
      footerStart={
        <Button
          variant="danger"
          icon="delete"
          onClick={() => {
            setAskingDelete(true);
          }}
        >
          Delete
        </Button>
      }
      footer={
        <>
          {isDirty ? (
            <span className={styles.dirtyHint}>
              <span className={styles.dirtyDot} aria-hidden="true" />
              Unsaved changes
            </span>
          ) : (
            <span className={styles.hint}>
              <kbd>Esc</kbd> to close
            </span>
          )}
          <Button variant="subtle" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={update.isPending} loadingText="Saving…">
            Save changes
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className={styles.layout}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className={styles.main}>
          <Field label="Title" required error={errors.title?.message}>
            <Input data-autofocus maxLength={200} className={styles.titleInput} {...register('title')} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <Textarea rows={10} maxLength={5000} placeholder="Add more detail…" {...register('description')} />
          </Field>
          <div className={styles.aiSuggest}>
            <Button variant="ai" size="sm" aria-haspopup="dialog" onClick={improve}>
              Improve this todo
            </Button>
            <span className={styles.aiHint}>Ask Kanbot for a clearer title, description and acceptance criteria.</span>
          </div>
        </div>

        <div className={styles.side}>
          <Field
            label="Sprint"
            error={errors.sprintId?.message}
            help={inCompletedSprint ? COMPLETED_HELP : undefined}
          >
            {/* Controlled: a natively disabled registered select would drop its value on submit. */}
            <Controller
              control={control}
              name="sprintId"
              render={({ field }) => (
                <Select {...field} disabled={inCompletedSprint}>
                  {sprintOptions(sprints, todo).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>

          <Field
            label="Status"
            error={errors.status?.message}
            help={statusEnabled || inCompletedSprint ? undefined : STATUS_HELP}
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select {...field} disabled={!statusEnabled}>
                  {TODO_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>

          <div className={styles.pair}>
            <Field label="Priority" error={errors.priority?.message}>
              <Select {...register('priority')}>
                {PRIORITY_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type" error={errors.type?.message}>
              <Select {...register('type')}>
                {TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {TYPE_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Story points" error={errors.storyPoints?.message}>
              <Select {...register('storyPoints')}>
                <option value={NO_POINTS}>None</option>
                {POINT_OPTIONS.map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Labels"
            error={errors.labels?.message}
            help={
              <>
                <kbd>Enter</kbd> or <kbd>,</kbd> adds a label, <kbd>Backspace</kbd> removes the last one
              </>
            }
          >
            <Controller
              control={control}
              name="labels"
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Add a label"
                />
              )}
            />
          </Field>

          <Field
            label="Due date"
            error={errors.dueDate?.message}
            help={overdue > 0 ? <span className={styles.overdue}>Overdue by {plural(overdue, 'day')}</span> : undefined}
          >
            <DateInput aria-invalid={overdue > 0 || undefined} {...register('dueDate')} />
          </Field>
        </div>
      </form>

      <ConfirmDialog
        open={askingDelete}
        onOpenChange={setAskingDelete}
        title={`Delete ${todo.key}?`}
        description={
          <>
            This permanently deletes <b>{todo.key}</b> “{todo.title}”. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete todo"
        onConfirm={confirmDelete}
        fallbackFocus={afterDelete ?? undefined}
      />
    </Dialog>
  );
}

/** Canvas order: the active sprint, the planned ones, then Backlog (BL-3). */
function sprintOptions(sprints: Sprint[] | undefined, todo: Todo) {
  const options = (sprints ?? [])
    .filter((sprint) => sprint.status !== 'completed' || sprint.id === todo.sprintId)
    .map((sprint) => ({ value: sprint.id, label: `${sprint.name} (${sprint.status})` }));
  // Sprints still loading: keep the current value selectable.
  if (todo.sprintId && !options.some((option) => option.value === todo.sprintId)) {
    options.push({ value: todo.sprintId, label: 'Current sprint' });
  }
  return [...options, { value: BACKLOG_VALUE, label: 'Backlog' }];
}

function saveErrorText(key: string, error: unknown) {
  // A message from the API itself (409, 404…) is worth showing; otherwise use the canvas copy.
  if (isApiError(error) && error.code !== 'NETWORK_ERROR' && error.code !== 'TIMEOUT' && error.status < 500) {
    return `Couldn't save ${key}. ${error.message} Your edits are still here.`;
  }
  return `Couldn't save ${key}. Check your connection and try again — your edits are still here.`;
}

/** The "Improve this todo" prompt: what the todo says now, and what to suggest (not to do). */
function improvePrompt(key: string, values: TodoFormValues): string {
  const points = values.storyPoints === NO_POINTS ? 'not estimated' : `${values.storyPoints} points`;
  return [
    `Improve ${key || 'this todo'}: suggest a clearer title, a better description and acceptance criteria. I'll review your suggestions and edit the todo myself.`,
    '',
    `Title: ${values.title.trim()}`,
    `Type: ${TYPE_LABELS[values.type]} · Priority: ${PRIORITY_LABELS[values.priority]} · ${points}`,
    // The chat takes 4000 characters a message; a long description is cut to leave room.
    `Description: ${values.description.trim().slice(0, 3000) || '(none)'}`,
  ].join('\n');
}
