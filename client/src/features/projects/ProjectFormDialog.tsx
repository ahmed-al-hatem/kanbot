import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { Field } from '@/components/Field/Field';
import { Input, Textarea } from '@/components/Field/Input';
import { ProjectAvatar } from '@/components/ProjectAvatar/ProjectAvatar';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { applyServerErrors, onInvalidSubmit } from '@/lib/formErrors';
import { generatedKey, normalizeKey, PROJECT_KEY_MAX } from '@/lib/projectKey';
import { announce } from '@/stores/announcer';
import type { ProjectWithStats } from '@/types/api';
import { projectFormSchema } from './projectSchema';
import styles from './ProjectsPage.module.css';

export const KEY_TAKEN = 'This key is already used';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this project; create a new one when omitted. */
  project?: ProjectWithStats | null;
  /** Keys the user already has, so the preview shows the key the server will really generate. */
  takenKeys: readonly string[];
  /** After the request succeeds; the parent closes the dialog, toasts and navigates. */
  onSaved: (project: ProjectWithStats) => void;
}

/**
 * New project / Edit project (DESIGN §9 12, PRJ-2, PRJ-3). Name required, key optional when
 * creating (2–6 letters, uppercased as you type), description. A live preview shows the key
 * todos will get, mirroring the server's generation. A 409 lands under Key.
 * Mount it fresh for every open (`key`), so it starts from the project's current values.
 */
export function ProjectFormDialog({ open, onOpenChange, project, takenKeys, onSaved }: ProjectFormDialogProps) {
  const isEdit = Boolean(project);
  const formId = useId();
  const create = useCreateProject();
  const update = useUpdateProject();
  const saving = create.isPending || update.isPending;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectFormSchema(isEdit ? 'edit' : 'create')),
    mode: 'onTouched',
    defaultValues: {
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? '',
    },
  });
  const name = useWatch({ control, name: 'name' });
  const typedKey = normalizeKey(useWatch({ control, name: 'key' }));
  const previewKey = typedKey || (project ? project.key : generatedKey(name, takenKeys));
  // Registered in form order: react-hook-form focuses the first invalid field by registration order.
  const nameField = register('name');
  const keyField = register('key');

  const onError = (error: unknown) => {
    // PRJ-2: a duplicate key is a 409 and always goes under Key.
    if (isApiError(error) && error.status === 409) {
      setError('key', { type: 'server', message: KEY_TAKEN }, { shouldFocus: true });
      announce('1 field needs attention');
      return;
    }
    if (applyServerErrors(error, setError, ['name', 'key', 'description'])) return;
    setFormError(isApiError(error) ? error.message : 'Something went wrong. Please try again.');
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const body = {
      name: values.name,
      description: values.description,
      // Creating without a key lets the server generate it (the preview shows which).
      ...(values.key ? { key: values.key } : {}),
    };
    if (project) {
      update.mutate({ projectId: project.id, body }, { onSuccess: onSaved, onError });
    } else {
      create.mutate(body, { onSuccess: onSaved, onError });
    }
  }, onInvalidSubmit);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit project' : 'Create project'}
      size="project"
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
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={saving}
            loadingText={isEdit ? 'Saving…' : 'Creating…'}
          >
            {isEdit ? 'Save changes' : 'Create project'}
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

        {/* Live preview (canvas): avatar, name and the key todos will be numbered with. */}
        <div className={styles.preview}>
          <ProjectAvatar id={project?.id ?? 'new'} name={name || 'New project'} size={40} />
          <span className={styles.previewText}>
            <span className={styles.previewName}>{name.trim() || 'New project'}</span>
            <span className="meta">
              {isEdit ? `New todos will be numbered ${previewKey}-…` : `Todos will be numbered ${previewKey}-1`}
            </span>
          </span>
        </div>

        <Field label="Project name" required error={errors.name?.message}>
          <Input data-autofocus placeholder="e.g. Kanbot Mobile" maxLength={80} {...nameField} />
        </Field>

        <Field
          label="Key"
          required={isEdit}
          error={errors.key?.message}
          help={
            isEdit
              ? "Changing the key doesn't change existing todo keys."
              : 'Optional · 2–6 letters. Leave it empty to generate one from the name.'
          }
        >
          <Input
            className={styles.keyInput}
            placeholder={isEdit ? undefined : generatedKey(name, takenKeys)}
            maxLength={PROJECT_KEY_MAX}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            {...keyField}
            onChange={(event) => {
              // Uppercased as you type (PRJ-2); the server stores it uppercase anyway.
              const upper = event.target.value.toUpperCase();
              if (upper !== event.target.value) event.target.value = upper;
              void keyField.onChange(event);
            }}
          />
        </Field>

        <Field label="Description" error={errors.description?.message}>
          <Textarea rows={3} placeholder="What is this project about?" {...register('description')} />
        </Field>
      </form>
    </Dialog>
  );
}
