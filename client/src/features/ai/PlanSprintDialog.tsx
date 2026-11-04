import { useId, useMemo, useState } from 'react';
import { Banner } from '@/components/Banner/Banner';
import { Button } from '@/components/Button/Button';
import { PointsPill } from '@/components/Chip/PointsPill';
import { Dialog } from '@/components/Dialog/Dialog';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Field } from '@/components/Field/Field';
import { Input } from '@/components/Field/Input';
import { Icon } from '@/components/Icon/Icon';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { nextSprintName, SPRINT_GOAL_MAX } from '@/features/sprints/sprintForm';
import { PriorityLabel } from '@/features/todos/PriorityLabel';
import { PRIORITY_OPTIONS } from '@/features/todos/todoMeta';
import { TypeIcon } from '@/features/todos/TypeIcon';
import { usePlanSprint } from '@/hooks/useAi';
import { useCreateSprint, useSprints } from '@/hooks/useSprints';
import { useProjectTodos } from '@/hooks/useTodos';
import { cx } from '@/lib/cx';
import { plural } from '@/lib/format';
import { announce } from '@/stores/announcer';
import type { Sprint, Todo } from '@/types/api';
import { aiErrorMessage } from './aiCopy';
import { AiDisclaimer, AiErrorPanel } from './AiParts';
import { stripInternalIds, todoKeysIn } from './aiText';
import styles from './AiDialogs.module.css';

/** Server limits (ai.routes.ts): capacity a whole number 1–200, focus ≤ 300. */
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 200;
const FOCUS_MAX = 300;
const DEFAULT_CAPACITY = '20';
const CAPACITY_ERROR = `Enter a whole number of points from ${CAPACITY_MIN} to ${CAPACITY_MAX}`;

const PRIORITY_RANK = Object.fromEntries(PRIORITY_OPTIONS.map((priority, index) => [priority, index]));

/** Backlog todos, highest priority first (DESIGN §9 09); ties keep the backlog order. */
function backlogByPriority(todos: Todo[]): Todo[] {
  return todos
    .filter((todo) => todo.sprintId === null)
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0) || a.order - b.order);
}

/**
 * The plan as the dialog shows it. The server keeps only real backlog ids and recomputes the
 * total, but returns the model's reasoning unchanged (assistant.service.ts), so the text can name
 * todos and points that aren't in the plan. The picks are the fact; the reasoning is an opinion.
 */
interface Suggestion {
  /** The AI's picks that are in the cached backlog, in its suggested order. */
  todoIds: string[];
  points: number;
  /** Capacity the plan was asked for. */
  capacity: number;
  reasoning: string;
  /** The reasoning names todo keys that aren't among the picks (in the backlog or not). */
  mentionsOthers: boolean;
}

const LEFT_OUT_NOTE = "Some todos the AI mentioned aren't in this plan.";
const NOTES_CAVEAT =
  "The AI's notes may not match the plan above — the plan is checked against your backlog and capacity.";

function parseCapacity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= CAPACITY_MIN && n <= CAPACITY_MAX ? n : null;
}

interface PlanSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** After the sprint is created: the parent toasts (and links to the backlog off it). */
  onCreated: (sprint: Sprint, todoCount: number) => void;
  /** "Generate todos" from the empty-backlog state. */
  onGenerate: () => void;
  /** Where focus goes on close when the opener is gone (a drawer chip). */
  fallbackFocus?: () => HTMLElement | null;
}

/**
 * DESIGN §9 09 Plan sprint (AI-3, AI-5): capacity (required, 1–200) and an optional focus →
 * Suggest plan → an editable goal, the reasoning, and the backlog (from the cache, sorted by
 * priority) with the AI's picks checked. A live bar shows the checked points against capacity;
 * over capacity it turns danger, says by how much, and Create is disabled. "Create Sprint N with
 * X todos" sends `POST /projects/:id/sprints { name, goal, todoIds }`; nothing is saved before.
 */
export function PlanSprintDialog({
  open,
  onOpenChange,
  projectId,
  onCreated,
  onGenerate,
  fallbackFocus,
}: PlanSprintDialogProps) {
  const formId = useId();
  const plan = usePlanSprint(projectId);
  const create = useCreateSprint(projectId);
  const todos = useProjectTodos(projectId, backlogByPriority);
  const { data: sprints = [] } = useSprints(projectId);
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY);
  const [focus, setFocus] = useState('');
  const [touched, setTouched] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [goal, setGoal] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [createError, setCreateError] = useState<string | null>(null);

  const candidates = useMemo(() => todos.data ?? [], [todos.data]);
  const cap = parseCapacity(capacity);
  const capacityError = touched && cap === null ? CAPACITY_ERROR : undefined;
  const picked = candidates.filter((todo) => selected.has(todo.id));
  const total = picked.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0);
  const over = cap !== null && total > cap;
  const sprintName = nextSprintName(sprints);
  const backlogEmpty = todos.isSuccess && candidates.length === 0;

  const suggest = () => {
    setTouched(true);
    if (cap === null) {
      document.getElementById(`${formId}-capacity`)?.focus();
      announce('1 field needs attention');
      return;
    }
    setCreateError(null);
    plan.mutate(
      { capacity: cap, ...(focus.trim() ? { focus: focus.trim() } : {}) },
      {
        onSuccess: (response) => {
          // Only ids the cached backlog knows; the server guarantees they are backlog todos.
          const byId = new Map(candidates.map((todo) => [todo.id, todo]));
          const ids = response.todoIds.filter((id) => byId.has(id));
          const points = ids.reduce((sum, id) => sum + (byId.get(id)?.storyPoints ?? 0), 0);
          const reasoning = stripInternalIds(response.reasoning);
          // Compared with the picks, not the backlog: a backlog todo the text says it added but
          // that isn't picked is a mismatch too.
          const pickedKeys = new Set(ids.map((id) => byId.get(id)?.key));
          setSuggestion({
            todoIds: ids,
            points,
            capacity: cap,
            reasoning,
            mentionsOthers: todoKeysIn(reasoning).some((key) => !pickedKeys.has(key)),
          });
          setGoal(stripInternalIds(response.goal).slice(0, SPRINT_GOAL_MAX));
          setSelected(new Set(ids));
          announce(`Plan ready: ${plural(ids.length, 'todo')}, ${points} of ${cap} points`);
        },
      },
    );
  };

  const toggle = (todoId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  };

  const createSprint = () => {
    if (picked.length === 0 || over) return;
    setCreateError(null);
    // The AI's order first (it is a suggested order), then anything the user added.
    const aiOrder = suggestion?.todoIds.filter((id) => selected.has(id)) ?? [];
    const added = picked.map((todo) => todo.id).filter((id) => !aiOrder.includes(id));
    const todoIds = [...aiOrder, ...added];
    create.mutate(
      { name: sprintName, goal: goal.trim(), todoIds },
      {
        onSuccess: (sprint) => {
          onCreated(sprint, todoIds.length);
        },
        onError: (error) => {
          setCreateError(`Couldn't create ${sprintName}. ${aiErrorMessage(error)}`);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!create.isPending) onOpenChange(next);
      }}
      size="plan"
      fallbackFocus={fallbackFocus}
      title={
        <span className={styles.dialogTitle}>
          <span className={styles.titleIcon} aria-hidden="true">
            <Icon name="ai-sparkle" />
          </span>
          Plan sprint with AI
        </span>
      }
      beforeFooter={
        // Pinned above the footer, outside the scrolling body, so it is seen on short screens.
        (over || createError !== null) && (
          <div className={styles.bar}>
            {over && (
              <p role="alert" className={cx(styles.overMessage, 'kb-pop')}>
                <Icon name="status-error" size={12} />
                Over capacity by {total - cap} pts. Unselect a todo or raise capacity.
              </p>
            )}
            {createError && (
              <Banner tone="danger" layout="inline">
                {createError}
              </Banner>
            )}
          </div>
        )
      }
      footer={
        <>
          <Button
            variant="subtle"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={create.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!suggestion || picked.length === 0 || over || cap === null || plan.isPending}
            loading={create.isPending}
            loadingText="Creating…"
            onClick={createSprint}
          >
            Create {sprintName} with {plural(picked.length, 'todo')}
          </Button>
        </>
      }
    >
      <form
        className={styles.planInputs}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          suggest();
        }}
      >
        <Field
          id={`${formId}-capacity`}
          label="Capacity (story points)"
          required
          error={capacityError}
          className={styles.capacityField}
        >
          <Input
            data-autofocus
            type="number"
            inputMode="numeric"
            min={CAPACITY_MIN}
            max={CAPACITY_MAX}
            step={1}
            value={capacity}
            onChange={(event) => {
              setCapacity(event.target.value);
            }}
            onBlur={() => {
              setTouched(true);
            }}
          />
        </Field>
        <Field label="Focus / goal (optional)" className={styles.focusField}>
          <Input
            maxLength={FOCUS_MAX}
            placeholder="e.g. finish user profile"
            value={focus}
            onChange={(event) => {
              setFocus(event.target.value);
            }}
          />
        </Field>
        <Button
          type="submit"
          variant="ai"
          className={styles.suggest}
          loading={plan.isPending}
          loadingText="Planning…"
          disabled={backlogEmpty || create.isPending}
        >
          {suggestion ? 'Suggest again' : 'Suggest plan'}
        </Button>
      </form>

      {backlogEmpty ? (
        <EmptyState
          icon="backlog"
          headingLevel={3}
          variant="dashed"
          title="Your backlog is empty"
          description="Add or generate todos first, then Kanbot can plan a sprint from them."
          actions={
            <Button variant="ai" onClick={onGenerate}>
              Generate todos
            </Button>
          }
        />
      ) : plan.isPending ? (
        <div role="status" aria-busy="true" className={styles.planSkeleton}>
          <span className="visually-hidden">Planning sprint</span>
          <div className={styles.planMain}>
            <Skeleton blockSize={56} radius="large" />
            {[1, 0.8, 0.6, 0.4].map((opacity) => (
              <Skeleton key={opacity} blockSize={40} opacity={opacity} />
            ))}
          </div>
          <div className={styles.planSide}>
            <Skeleton blockSize={240} radius="large" />
          </div>
        </div>
      ) : plan.isError ? (
        <AiErrorPanel
          title="Kanbot couldn't plan the sprint right now"
          error={plan.error}
          hint="Your capacity and focus are kept."
          onRetry={suggest}
        />
      ) : suggestion ? (
        <div className={styles.planResult}>
          <div className={cx(styles.goalBox, 'kb-rise')}>
            <Field label="Suggested sprint goal" className={styles.goalField}>
              <Input
                maxLength={SPRINT_GOAL_MAX}
                value={goal}
                onChange={(event) => {
                  setGoal(event.target.value);
                }}
              />
            </Field>
          </div>

          <div className={styles.planColumns}>
            <section className={styles.planMain} aria-labelledby={`${formId}-todos`}>
              <h3 id={`${formId}-todos`} className={styles.sectionLabel}>
                Backlog todos
              </h3>
              <div className={styles.candidates}>
                <ul className={styles.candidateList}>
                  {candidates.map((todo, index) => (
                    <CandidateRow
                      key={todo.id}
                      todo={todo}
                      index={index}
                      checked={selected.has(todo.id)}
                      onToggle={toggle}
                    />
                  ))}
                </ul>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <ProgressBar
                    value={total}
                    max={cap ?? total}
                    height={8}
                    over={over}
                    label="Points against capacity"
                    valueText={`${total} of ${cap ?? '?'} points`}
                    className={styles.capacityBar}
                  />
                  <span className={cx(styles.totalValue, over && styles.overText)}>
                    {total} / {cap ?? '–'} pts
                  </span>
                </div>
              </div>
            </section>

            <section className={styles.planSide} aria-labelledby={`${formId}-why`}>
              <h3 id={`${formId}-why`} className={styles.sectionLabel}>
                AI&apos;s suggestion
              </h3>
              <div className={styles.reasoning}>
                {/* The fact, computed from the picks that are really in the backlog. */}
                <p className={styles.planFact}>
                  {plural(suggestion.todoIds.length, 'todo')} · {suggestion.points} / {suggestion.capacity} pts
                </p>
                <p className={styles.asSuggested}>As first suggested. Your changes show in the list and its total.</p>
                <div className={styles.opinion}>
                  <h4 className={styles.sectionLabel}>AI&apos;s reasoning</h4>
                  <p>{suggestion.reasoning}</p>
                  <p className={styles.caveat}>{NOTES_CAVEAT}</p>
                  {suggestion.mentionsOthers && (
                    <p className={styles.leftOut}>
                      <Icon name="warning-outline" size={12} />
                      {LEFT_OUT_NOTE}
                    </p>
                  )}
                </div>
                <AiDisclaimer className={styles.reasoningNote} />
              </div>
            </section>
          </div>
        </div>
      ) : (
        <p className={styles.emptyNote}>
          {todos.isPending
            ? 'Loading your backlog…'
            : `Kanbot picks backlog todos that fit your capacity, highest priority first. ${plural(candidates.length, 'todo')} in the backlog.`}
        </p>
      )}

      {!suggestion && !backlogEmpty && <AiDisclaimer className={styles.disclaimer} />}
    </Dialog>
  );
}

interface CandidateRowProps {
  todo: Todo;
  index: number;
  checked: boolean;
  onToggle: (todoId: string) => void;
}

function CandidateRow({ todo, index, checked, onToggle }: CandidateRowProps) {
  return (
    <li
      className={cx(styles.candidate, !checked && styles.unchecked, 'kb-rise')}
      style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
    >
      <label className={styles.candidateLabel}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => {
            onToggle(todo.id);
          }}
        />
        <TypeIcon type={todo.type} />
        <span className={styles.candidateKey}>{todo.key}</span>
        <span className={styles.candidateTitle}>{todo.title}</span>
        <PriorityLabel priority={todo.priority} className={styles.candidatePriority} />
        <PointsPill points={todo.storyPoints} />
      </label>
    </li>
  );
}
