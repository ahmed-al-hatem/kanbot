import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { isApiError } from '@/api/errors';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { Checkbox } from '@/components/Field/Checkbox';
import { Field } from '@/components/Field/Field';
import { Icon } from '@/components/Icon/Icon';
import { Input, Textarea } from '@/components/Field/Input';
import { ProjectAvatar } from '@/components/ProjectAvatar/ProjectAvatar';
import { useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useT } from '@/i18n';
import { errorMessage } from '@/i18n/errors';
import {
  announceInvalid,
  applyLocalizedServerErrors,
  onInvalidSubmit,
  useLocalizedErrors,
} from '@/lib/formErrors';
import { generatedKey, normalizeKey, PROJECT_KEY_MAX } from '@/lib/projectKey';
import type { ProjectWithStats } from '@/types/api';
import { projectFormSchema } from './projectSchema';
import styles from './ProjectsPage.module.css';

/** The preview avatar's id before the project exists (it only seeds the avatar's color). */
const NEW_PROJECT_ID = 'new';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this project; create a new one when omitted. */
  project?: ProjectWithStats | null;
  /** Keys the user already has, so the preview shows the key the server will really generate. */
  takenKeys: readonly string[];
  /**
   * After the request succeeds; the parent closes the dialog, toasts and navigates. `starter`:
   * the user asked for an AI starter backlog (DESIGN §9 12, plan §9.4) — create only.
   */
  onSaved: (project: ProjectWithStats, options: { starter: boolean }) => void;
}

/**
 * New project / Edit project (DESIGN §9 12, PRJ-2, PRJ-3). Name required, key optional when
 * creating (2–6 letters, uppercased as you type), description. A live preview shows the key
 * todos will get, mirroring the server's generation. A 409 lands under Key.
 * Mount it fresh for every open (`key`), so it starts from the project's current values.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  takenKeys,
  onSaved,
}: ProjectFormDialogProps) {
  const t = useT();
  const isEdit = Boolean(project);
  const formId = useId();
  const create = useCreateProject();
  const update = useUpdateProject();
  const saving = create.isPending || update.isPending;
  /** The failed request behind the banner (null: no banner); its text is read at render. */
  const [formError, setFormError] = useState<unknown>(null);
  const [starter, setStarter] = useState(false);

  const schema = useMemo(() => projectFormSchema(isEdit ? 'edit' : 'create', t), [isEdit, t]);

  const {
    register,
    handleSubmit,
    setError,
    trigger,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: project?.name ?? '',
      key: project?.key ?? '',
      description: project?.description ?? '',
    },
  });
  const setServerError = useLocalizedErrors({ errors, setError, trigger });
  const name = useWatch({ control, name: 'name' });
  const typedKey = normalizeKey(useWatch({ control, name: 'key' }));
  const previewKey = typedKey || (project ? project.key : generatedKey(name, takenKeys));
  // Registered in form order: react-hook-form focuses the first invalid field by registration order.
  const nameField = register('name');
  const keyField = register('key');

  const onError = (error: unknown) => {
    // PRJ-2: a duplicate key is a 409 and always goes under Key.
    if (isApiError(error) && error.status === 409) {
      setServerError('key', (messages) => messages.projects.form.keyTaken, { shouldFocus: true });
      announceInvalid(1);
      return;
    }
    if (applyLocalizedServerErrors(error, setServerError, ['name', 'key', 'description'])) return;
    setFormError(error);
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
      update.mutate(
        { projectId: project.id, body },
        {
          onSuccess: (saved) => {
            onSaved(saved, { starter: false });
          },
          onError,
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: (saved) => {
          onSaved(saved, { starter });
        },
        onError,
      });
    }
  }, onInvalidSubmit);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t.projects.form.editTitle : t.projects.form.createTitle}
      size="project"
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
            loading={saving}
            loadingText={isEdit ? t.common.saving : t.common.creating}
          >
            {isEdit ? t.common.saveChanges : t.projects.form.create}
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
            {errorMessage(formError, t)}
          </Banner>
        )}

        {/* Live preview (canvas): avatar, name and the key todos will be numbered with. */}
        <div className={styles.preview}>
          <ProjectAvatar
            id={project?.id ?? NEW_PROJECT_ID}
            name={name || t.projects.form.untitled}
            size={40}
          />
          <span className={styles.previewText}>
            <span className={styles.previewName}>{name.trim() || t.projects.form.untitled}</span>
            <span className="meta">
              {isEdit
                ? t.projects.form.previewEdit(previewKey)
                : t.projects.form.previewCreate(previewKey)}
            </span>
          </span>
        </div>

        <Field label={t.projects.form.name} required error={errors.name?.message}>
          <Input
            data-autofocus
            placeholder={t.projects.form.namePlaceholder}
            maxLength={80}
            {...nameField}
          />
        </Field>

        <Field
          label={t.projects.form.key}
          required={isEdit}
          error={errors.key?.message}
          help={isEdit ? t.projects.form.keyHelpEdit : t.projects.form.keyHelpCreate}
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

        <Field label={t.projects.form.description} error={errors.description?.message}>
          <Textarea
            rows={3}
            placeholder={t.projects.form.descriptionPlaceholder}
            {...register('description')}
          />
        </Field>

        {!isEdit && (
          <Checkbox
            className={styles.starter}
            checked={starter}
            onChange={(event) => {
              setStarter(event.target.checked);
            }}
            label={
              <span className={styles.starterLabel}>
                <Icon name="ai-sparkle" size={12} className={styles.starterIcon} />
                {t.projects.form.starter}
              </span>
            }
            description={t.projects.form.starterHelp}
          />
        )}
      </form>
    </Dialog>
  );
}
