import { useId, useState } from 'react';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { Dialog } from '@/components/Dialog/Dialog';
import { Field } from '@/components/Field/Field';
import { Textarea } from '@/components/Field/Input';
import { Select } from '@/components/Field/Select';
import { Icon } from '@/components/Icon/Icon';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import {
  isTodoPriority,
  isTodoType,
  POINT_OPTIONS,
  PRIORITY_OPTIONS,
  TYPE_OPTIONS,
} from '@/features/todos/todoMeta';
import { useGenerateTodos } from '@/hooks/useAi';
import { useBulkCreateTodos } from '@/hooks/useTodos';
import { getT, useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { announce } from '@/stores/announcer';
import { useHighlight } from '@/stores/highlight';
import type { CreateTodoRequest, DraftTodo, Todo } from '@/types/api';
import { aiErrorMessage } from './aiCopy';
import { AiDisclaimer, AiErrorPanel, ThinkingDots } from './AiParts';
import styles from './AiDialogs.module.css';

/** Server limits (ai.routes.ts): prompt 3–2000, count 1–10 (default 5); todo title ≤ 200. */
const PROMPT_MIN = 3;
const PROMPT_MAX = 2000;
const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DEFAULT_COUNT = 5;
const TITLE_MAX = 200;
const NO_POINTS = '';

interface Draft extends DraftTodo {
  key: number;
  checked: boolean;
}

interface GenerateTodosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** Pre-filled description, e.g. the project's description for a starter backlog. */
  initialPrompt?: string;
  /** After the bulk create: the parent toasts (and links to the backlog off it). */
  onAdded: (todos: Todo[]) => void;
  /** Where focus goes on close when the opener is gone (a drawer chip). */
  fallbackFocus?: () => HTMLElement | null;
}

let draftKey = 0;

/**
 * DESIGN §9 08 Generate todos (AI-2, AI-5): describe a feature (3–2000, with a counter) and a
 * count (1–10, default 5) → Generate shows 3 skeleton rows, then draft rows — all checked — with
 * editable title, type, priority and points, and Select all. "Add N todos to Backlog" saves only
 * the checked drafts with one bulk request; nothing is saved before that click. An AI failure is
 * the dashed error panel with Try again; the description stays.
 */
export function GenerateTodosDialog({
  open,
  onOpenChange,
  projectId,
  initialPrompt = '',
  onAdded,
  fallbackFocus,
}: GenerateTodosDialogProps) {
  const t = useT();
  const copy = t.ai.generate;
  const formId = useId();
  const promptId = `${formId}-prompt`;
  const draftsId = `${formId}-drafts`;
  const generate = useGenerateTodos(projectId);
  const add = useBulkCreateTodos(projectId);
  const markTodo = useHighlight((s) => s.markTodo);
  const [prompt, setPrompt] = useState(initialPrompt.slice(0, PROMPT_MAX));
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [touched, setTouched] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  // The failed request, not its text: the banner reads it at render, in the UI language.
  const [addError, setAddError] = useState<unknown>(null);

  const trimmed = prompt.trim();
  const promptError = touched && trimmed.length < PROMPT_MIN ? copy.promptRequired : undefined;
  const checked = drafts?.filter((draft) => draft.checked) ?? [];
  const blankTitle = checked.some((draft) => !draft.title.trim());
  const points = checked.reduce((sum, draft) => sum + (draft.storyPoints ?? 0), 0);
  const allChecked = drafts !== null && drafts.length > 0 && checked.length === drafts.length;

  const run = () => {
    setTouched(true);
    if (trimmed.length < PROMPT_MIN) {
      document.getElementById(promptId)?.focus();
      announce(getT().common.fieldsNeedAttention(1));
      return;
    }
    setAddError(null);
    generate.mutate(
      { prompt: trimmed, count },
      {
        onSuccess: ({ todos }) => {
          setDrafts(
            todos.map((todo) => ({
              ...todo,
              title: todo.title.slice(0, TITLE_MAX),
              key: draftKey++,
              checked: true,
            })),
          );
          announce(getT().ai.generate.ready(todos.length));
        },
      },
    );
  };

  const update = (key: number, patch: Partial<Draft>) => {
    setDrafts(
      (list) => list?.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)) ?? null,
    );
  };

  const toggleAll = () => {
    setDrafts((list) => list?.map((draft) => ({ ...draft, checked: !allChecked })) ?? null);
  };

  const save = () => {
    if (checked.length === 0 || blankTitle) return;
    setAddError(null);
    const body: CreateTodoRequest[] = checked.map((draft) => ({
      title: draft.title.trim(),
      description: draft.description,
      type: draft.type,
      priority: draft.priority,
      storyPoints: draft.storyPoints,
    }));
    add.mutate(body, {
      onSuccess: (created) => {
        for (const todo of created) markTodo(todo.id);
        onAdded(created);
      },
      onError: (error) => {
        setAddError(error);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!add.isPending) onOpenChange(next);
      }}
      size="generate"
      fallbackFocus={fallbackFocus}
      title={
        <span className={styles.dialogTitle}>
          <span className={styles.titleIcon} aria-hidden="true">
            <Icon name="ai-sparkle" />
          </span>
          {copy.title}
        </span>
      }
      beforeFooter={
        addError !== null && (
          <div className={styles.bar}>
            <Banner tone="danger" layout="inline">
              {copy.addFailed(aiErrorMessage(addError, t))}
            </Banner>
          </div>
        )
      }
      footerStart={
        drafts && drafts.length > 0 ? (
          <span className={styles.total}>
            <b>{copy.totalPoints(points)}</b>
            {copy.totalSuffix}
          </span>
        ) : undefined
      }
      footer={
        <>
          <Button
            variant="subtle"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={add.isPending}
          >
            {t.common.cancel}
          </Button>
          <Button
            variant="primary"
            disabled={checked.length === 0 || blankTitle || generate.isPending}
            loading={add.isPending}
            loadingText={copy.adding}
            onClick={save}
          >
            {copy.add(checked.length)}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className={styles.stack}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <Field
          id={promptId}
          label={copy.prompt}
          required
          error={promptError}
          help={<span className={styles.counter}>{copy.counter(prompt.length, PROMPT_MAX)}</span>}
        >
          <Textarea
            data-autofocus
            rows={3}
            maxLength={PROMPT_MAX}
            placeholder={copy.promptPlaceholder}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
            }}
            onBlur={() => {
              setTouched(true);
            }}
          />
        </Field>

        <div className={styles.generateRow}>
          <Field label={copy.count} className={styles.countField}>
            <Select
              value={String(count)}
              onChange={(event) => {
                setCount(Number(event.target.value));
              }}
            >
              {COUNT_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <span className={styles.hint}>{copy.hint}</span>
          <Button
            type="submit"
            variant="ai"
            loading={generate.isPending}
            loadingText={copy.generating}
            disabled={add.isPending}
          >
            {drafts ? copy.regenerate : copy.generate}
          </Button>
        </div>
      </form>

      <div className={styles.divider} />

      {generate.isPending ? (
        <div role="status" aria-busy="true" className={styles.loading}>
          <span className={styles.loadingText}>
            {copy.drafting} <ThinkingDots />
          </span>
          {[1, 0.8, 0.6].map((opacity) => (
            <Skeleton key={opacity} blockSize={48} radius="large" opacity={opacity} />
          ))}
        </div>
      ) : generate.isError ? (
        <AiErrorPanel
          title={copy.failedTitle}
          error={generate.error}
          hint={copy.failedHint}
          onRetry={run}
        />
      ) : drafts?.length === 0 ? (
        <p className={styles.emptyNote}>{copy.noDrafts}</p>
      ) : drafts ? (
        <section className={styles.drafts} aria-labelledby={draftsId}>
          <div className={styles.draftsHead}>
            <h3 id={draftsId} className={styles.sectionTitle}>
              {copy.suggested}{' '}
              <span className={styles.muted}>{copy.suggestedCount(drafts.length)}</span>
            </h3>
            <label className={styles.selectAll}>
              <input
                type="checkbox"
                checked={allChecked}
                ref={(input) => {
                  if (input) input.indeterminate = checked.length > 0 && !allChecked;
                }}
                onChange={toggleAll}
              />
              {copy.selectAll}
            </label>
          </div>
          <div className={styles.draftScroll}>
            <div className={cx(styles.draftGrid, styles.draftHeader)} aria-hidden="true">
              <span />
              <span>{t.todos.details.title}</span>
              <span>{t.todos.details.type}</span>
              <span>{t.todos.details.priority}</span>
              <span>{copy.points}</span>
            </div>
            <ul className={styles.draftList}>
              {drafts.map((draft, index) => (
                <DraftRow key={draft.key} draft={draft} index={index} onChange={update} />
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <p className={styles.emptyNote}>{copy.intro}</p>
      )}

      <AiDisclaimer className={styles.disclaimer} />
    </Dialog>
  );
}

interface DraftRowProps {
  draft: Draft;
  index: number;
  onChange: (key: number, patch: Partial<Draft>) => void;
}

function DraftRow({ draft, index, onChange }: DraftRowProps) {
  const t = useT();
  const copy = t.ai.generate;
  const n = index + 1;
  const name = draft.title.trim() || copy.draftName(n);
  const invalid = draft.checked && !draft.title.trim();
  return (
    <li
      className={cx(
        styles.draftGrid,
        styles.draftRow,
        !draft.checked && styles.unchecked,
        'kb-rise',
      )}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <input
        type="checkbox"
        checked={draft.checked}
        aria-label={copy.include(name)}
        onChange={(event) => {
          onChange(draft.key, { checked: event.target.checked });
        }}
      />
      <input
        className={styles.control}
        type="text"
        maxLength={TITLE_MAX}
        value={draft.title}
        aria-label={copy.titleOf(n)}
        aria-invalid={invalid || undefined}
        title={invalid ? copy.blankTitle : undefined}
        onChange={(event) => {
          onChange(draft.key, { title: event.target.value });
        }}
      />
      <select
        className={styles.control}
        aria-label={copy.typeOf(n)}
        value={draft.type}
        onChange={(event) => {
          const value = event.target.value;
          if (isTodoType(value)) onChange(draft.key, { type: value });
        }}
      >
        {TYPE_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {t.todos.type[value]}
          </option>
        ))}
      </select>
      <select
        className={styles.control}
        aria-label={copy.priorityOf(n)}
        value={draft.priority}
        onChange={(event) => {
          const value = event.target.value;
          if (isTodoPriority(value)) onChange(draft.key, { priority: value });
        }}
      >
        {PRIORITY_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {t.todos.priority[value]}
          </option>
        ))}
      </select>
      <select
        className={styles.control}
        aria-label={copy.pointsOf(n)}
        value={draft.storyPoints === null ? NO_POINTS : String(draft.storyPoints)}
        onChange={(event) => {
          const value = event.target.value;
          onChange(draft.key, {
            storyPoints: POINT_OPTIONS.find((points) => String(points) === value) ?? null,
          });
        }}
      >
        <option value={NO_POINTS}>{t.todos.details.noPoints}</option>
        {POINT_OPTIONS.map((value) => (
          <option key={value} value={String(value)}>
            {value}
          </option>
        ))}
      </select>
    </li>
  );
}
