import { DndContext, DragOverlay, MeasuringStrategy } from '@dnd-kit/core';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { isApiError } from '@/api/errors';
import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { Button } from '@/components/Button/Button';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Icon } from '@/components/Icon/Icon';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ProjectMeta } from '@/components/PageHeader/ProjectMeta';
import { Skeleton, SkeletonRegion } from '@/components/Skeleton/Skeleton';
import { SprintFormDialog } from '@/features/sprints/SprintFormDialog';
import { StartSprintDialog } from '@/features/sprints/StartSprintDialog';
import { todoNeighbourFocus } from '@/features/todos/todoFocus';
import { useRemoveTodo } from '@/features/todos/useRemoveTodo';
import { useBacklog, type BacklogGroup as Group } from '@/hooks/useBacklog';
import { useCurrentProject } from '@/hooks/useProjects';
import { useDeleteSprint, useSprints } from '@/hooks/useSprints';
import { cx } from '@/lib/cx';
import { useDragSensors } from '@/lib/dnd/sensors';
import { useListsDnd } from '@/lib/dnd/useListsDnd';
import { plural, todosAndPoints } from '@/lib/format';
import { useDelayedLoading } from '@/lib/useDelayedLoading';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useAssistant } from '@/stores/assistant';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import type { Sprint, Todo } from '@/types/api';
import styles from './Backlog.module.css';
import { BacklogGroup } from './BacklogGroup';
import { isFiltering, matchesFilters, readFilters, writeFilters, type BacklogFilters } from './backlogFilters';
import { FilterBar } from './FilterBar';
import { QuickCreate } from './QuickCreate';
import { SprintActions } from './SprintActions';
import { DRAG_OFF_ID, ROW_HELP_ID, TodoRowPreview, type MoveTargetGroup } from './TodoRow';
import { DRAG_OFF_TEXT, useBacklogMoves } from './useBacklogMoves';

interface DeleteState {
  open: boolean;
  todo: Todo | null;
  /** Neighbour captured when the confirm opened, for when the row is gone on close. */
  focus: (() => HTMLElement | null) | undefined;
}

/** One state per sprint dialog; `key` remounts the form so it starts from fresh defaults. */
interface SprintFormState {
  open: boolean;
  sprint: Sprint | null;
  key: number;
}

interface GroupDialogState {
  open: boolean;
  group: Group | null;
}

const pageTitle = () => document.querySelector<HTMLElement>('.page-title');
// dnd-kit re-measures while dragging, so a group that grows as a row joins it still takes drops.
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };
const DRAG_INSTRUCTIONS = {
  draggable:
    'To pick up a todo, press Space or Enter. Use the up and down arrow keys to move it, Space or Enter to drop it, Escape to cancel.',
};
// The active sprint's order is per status column (the board's), so a drop inside it changes nothing.
const isReorderable = (group: Group) => group.kind !== 'active';

/**
 * `/projects/:projectId/backlog` (DESIGN §9 04; BL-1…7, SPR-1…3): the active sprint, the planned
 * sprints and the Backlog, each with count and points; filters in the URL; quick create; sprint
 * create / edit / delete / start; drag and drop, ↑/↓ and ⋯ "Move to…" between and inside groups.
 * Todo details opens from `?todo=` (project layout).
 */
export function BacklogPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { data: project } = useCurrentProject();
  const backlog = useBacklog(projectId);
  const { data: sprints = [] } = useSprints(projectId);
  const showSkeleton = useDelayedLoading(backlog.isPending);
  const [params, setParams] = useSearchParams();
  const urlFilters = readFilters(params);
  // Filtering a long list never blocks typing: the rows follow a moment later (plan §5.5).
  const q = useDeferredValue(urlFilters.q);
  const highlightIds = useHighlight((s) => s.todoIds);
  const removeTodo = useRemoveTodo();
  const reducedMotion = useReducedMotion();
  const quickCreateRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [toDelete, setToDelete] = useState<DeleteState>({ open: false, todo: null, focus: undefined });
  const [sprintForm, setSprintForm] = useState<SprintFormState>({ open: false, sprint: null, key: 0 });
  const [toStart, setToStart] = useState<GroupDialogState>({ open: false, group: null });
  const [sprintToDelete, setSprintToDelete] = useState<GroupDialogState>({ open: false, group: null });
  const deleteSprint = useDeleteSprint(projectId);
  const openAiDialog = useAssistant((s) => s.openDialog);
  const boardPath = `/projects/${projectId}/board`;

  const filters = useMemo<BacklogFilters>(
    () => ({ q, priority: urlFilters.priority, type: urlFilters.type }),
    [q, urlFilters.priority, urlFilters.type],
  );
  const filtering = isFiltering(filters);
  const { groups } = backlog;
  const visible = useMemo(
    () => groups?.map((group) => (filtering ? group.todos.filter((todo) => matchesFilters(todo, filters)) : group.todos)),
    [groups, filters, filtering],
  );
  const moveTargets = useMemo<MoveTargetGroup[]>(
    () => groups?.map((group) => ({ id: group.id, name: group.name, kind: group.kind })) ?? [],
    [groups],
  );
  const activeSprint = groups?.find((group) => group.kind === 'active')?.sprint ?? null;

  const { moveTo, onKeyMove, onMenuMove } = useBacklogMoves(projectId, groups, filtering);
  const sensors = useDragSensors({ keyboard: true });
  const dnd = useListsDnd(groups, moveTo, { sensors, instructions: DRAG_INSTRUCTIONS, reorderable: isReorderable });

  const total = groups?.reduce((count, group) => count + group.todos.length, 0) ?? 0;
  const points = groups?.reduce((sum, group) => sum + group.points, 0) ?? 0;
  const shown = visible?.reduce((count, list) => count + list.length, 0) ?? 0;

  // Filters replace the history entry: typing a search shouldn't fill Back.
  const updateFilters = useCallback(
    (patch: Partial<BacklogFilters>) => {
      setParams((current) => writeFilters(current, patch), { replace: true });
    },
    [setParams],
  );
  const clearFilters = () => {
    updateFilters({ q: '', priority: null, type: null });
  };

  const openTodo = useCallback(
    (todoId: string) => {
      // Pushed, so Back closes the dialog.
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('todo', todoId);
        return next;
      });
    },
    [setParams],
  );
  const askDelete = useCallback((todo: Todo) => {
    setToDelete({ open: true, todo, focus: todoNeighbourFocus(todo.id) });
  }, []);
  const toggleGroup = useCallback((groupId: string) => {
    setCollapsed((state) => ({ ...state, [groupId]: !state[groupId] }));
  }, []);

  const confirmDelete = () => {
    const todo = toDelete.todo;
    if (!todo) return;
    setToDelete((state) => ({ ...state, open: false }));
    removeTodo(todo);
  };

  const focusQuickCreate = () => {
    setCollapsed((state) => ({ ...state, backlog: false }));
    quickCreateRef.current?.focus();
  };

  // ---------- Sprints (SPR-1…3) ----------
  const openSprintForm = (sprint: Sprint | null) => {
    setSprintForm((state) => ({ open: true, sprint, key: state.key + 1 }));
  };
  const onSprintSaved = (sprint: Sprint, mode: 'create' | 'edit') => {
    setSprintForm((state) => ({ ...state, open: false }));
    const message = mode === 'create' ? `${sprint.name} created · drag todos into it` : `${sprint.name} saved`;
    // The toast region is role="status", so it is announced; no second announcement.
    toast.success(message);
  };

  /** SPR-3 and DESIGN §9 04: blocked while another sprint is active, and when the sprint is empty. */
  const askStart = (group: Group) => {
    if (activeSprint && activeSprint.id !== group.id) {
      toast.error(`Complete ${activeSprint.name} before starting ${group.name}.`, {
        action: {
          label: 'Go to board',
          onClick: () => {
            void navigate(boardPath);
          },
        },
      });
      return;
    }
    if (group.todos.length === 0) {
      toast.error(`Add todos to ${group.name} before starting it.`);
      return;
    }
    setToStart({ open: true, group });
  };
  const onStarted = (sprint: Sprint) => {
    setToStart((state) => ({ ...state, open: false }));
    toast.success(`${sprint.name} started`);
    void navigate(boardPath);
  };

  const confirmDeleteSprint = () => {
    const group = sprintToDelete.group;
    if (!group?.sprint) return;
    const count = group.todos.length;
    deleteSprint.mutate(group.sprint, {
      onSuccess: () => {
        setSprintToDelete((state) => ({ ...state, open: false }));
        const message =
          count > 0 ? `${group.name} deleted · ${plural(count, 'todo')} moved to the backlog` : `${group.name} deleted`;
        toast.success(message);
      },
      onError: (error) => {
        setSprintToDelete((state) => ({ ...state, open: false }));
        toast.error(`Couldn't delete ${group.name}. ${isApiError(error) ? error.message : 'Please try again.'}`);
      },
    });
  };

  const sprintGroupActions = (group: Group) =>
    group.sprint ? (
      <SprintActions
        group={group}
        sprint={group.sprint}
        activeSprint={activeSprint}
        boardPath={boardPath}
        onStart={askStart}
        onEdit={openSprintForm}
        onDelete={(target) => {
          setSprintToDelete({ open: true, group: target });
        }}
      />
    ) : undefined;

  return (
    <div className="kb-page">
      <title>{project ? `Backlog · ${project.name} · Kanbot` : 'Backlog · Kanbot'}</title>
      <PageHeader
        title="Backlog"
        meta={
          <>
            <ProjectMeta project={project} />
            {groups && <span className={styles.headerTotals}>{todosAndPoints(total, points)}</span>}
          </>
        }
        actions={
          <>
            <Button
              variant="ai"
              onClick={() => {
                openAiDialog({ kind: 'generate', projectId });
              }}
            >
              Generate todos
            </Button>
            <Button
              variant="ai"
              disabled={!groups}
              onClick={() => {
                openAiDialog({ kind: 'plan', projectId });
              }}
            >
              Plan sprint
            </Button>
            <Button
              icon="add"
              disabled={!groups}
              onClick={() => {
                openSprintForm(null);
              }}
            >
              Create sprint
            </Button>
            <AskAiButton />
          </>
        }
      />

      <div className="page-body">
        {showSkeleton ? (
          <BacklogSkeleton />
        ) : backlog.error ? (
          <PageError page="the backlog" error={backlog.error} onRetry={backlog.refetch} retrying={backlog.isRefetching} />
        ) : !groups || !visible ? null : (
          <div className={styles.backlog}>
            <FilterBar filters={urlFilters} onChange={updateFilters} onClear={clearFilters} shown={shown} total={total} />
            {filtering && (
              <p id={DRAG_OFF_ID} className={cx(styles.dragOff, 'kb-pop')}>
                <Icon name="drag-handle-vertical" />
                {DRAG_OFF_TEXT}
              </p>
            )}

            <DndContext {...dnd.contextProps} measuring={MEASURING}>
              {groups.map((group, index) => (
                <BacklogGroup
                  key={group.id}
                  group={group}
                  rows={dnd.previewRows(group.id) ?? visible[index] ?? []}
                  filtering={filtering}
                  collapsed={Boolean(collapsed[group.id])}
                  onToggle={toggleGroup}
                  isOver={dnd.overList === group.id}
                  highlightIds={highlightIds}
                  moveTargets={moveTargets}
                  onOpen={openTodo}
                  onDelete={askDelete}
                  onMove={onMenuMove}
                  onKeyMove={onKeyMove}
                  actions={sprintGroupActions(group)}
                  empty={
                    group.kind === 'backlog' && !filtering ? (
                      <EmptyState
                        icon="backlog"
                        headingLevel={3}
                        className={styles.emptyBacklog}
                        title="Your backlog is empty"
                        description="Capture the work ahead: type a title below, or let AI draft todos from a feature description."
                        actions={
                          <>
                            <Button
                              variant="ai"
                              onClick={() => {
                                openAiDialog({ kind: 'generate', projectId });
                              }}
                            >
                              Generate todos
                            </Button>
                            <Button variant="primary" icon="add" onClick={focusQuickCreate}>
                              Create todo
                            </Button>
                          </>
                        }
                      />
                    ) : undefined
                  }
                  footer={group.kind === 'backlog' && <QuickCreate projectId={projectId} inputRef={quickCreateRef} />}
                />
              ))}
              {createPortal(
                // Reduced motion: the row lands where it is dropped, without the fly-back (plan §9.6).
                <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
                  {dnd.activeTodo && <TodoRowPreview todo={dnd.activeTodo} />}
                </DragOverlay>,
                document.body,
              )}
            </DndContext>

            {!filtering && (
              <p className={styles.moveHelp}>
                Drag rows between groups, or focus a title and use <kbd>↑</kbd> <kbd>↓</kbd> to move it.
              </p>
            )}
            <span id={ROW_HELP_ID} className="visually-hidden">
              Press Enter to open its details. Press the up and down arrow keys to move it.
            </span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toDelete.open}
        onOpenChange={(open) => {
          setToDelete((state) => ({ ...state, open }));
        }}
        title={`Delete ${toDelete.todo?.key ?? 'todo'}?`}
        description={
          <>
            This permanently deletes <b>{toDelete.todo?.key}</b> “{toDelete.todo?.title}”. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete todo"
        onConfirm={confirmDelete}
        fallbackFocus={toDelete.focus}
      />

      {sprintForm.key > 0 && (
        <SprintFormDialog
          key={sprintForm.key}
          open={sprintForm.open}
          onOpenChange={(open) => {
            setSprintForm((state) => ({ ...state, open }));
          }}
          projectId={projectId}
          sprint={sprintForm.sprint}
          sprints={sprints}
          onSaved={onSprintSaved}
        />
      )}

      {toStart.group?.sprint && (
        <StartSprintDialog
          key={toStart.group.id}
          open={toStart.open}
          onOpenChange={(open) => {
            setToStart((state) => ({ ...state, open }));
          }}
          projectId={projectId}
          sprint={toStart.group.sprint}
          todoCount={toStart.group.todos.length}
          points={toStart.group.points}
          onStarted={onStarted}
        />
      )}

      <ConfirmDialog
        open={sprintToDelete.open}
        onOpenChange={(open) => {
          setSprintToDelete((state) => ({ ...state, open }));
        }}
        title={`Delete ${sprintToDelete.group?.name ?? 'sprint'}?`}
        description={
          sprintToDelete.group && sprintToDelete.group.todos.length > 0 ? (
            <>
              Its {plural(sprintToDelete.group.todos.length, 'todo')} {sprintToDelete.group.todos.length === 1 ? 'goes' : 'go'}{' '}
              back to the backlog; no todos are deleted.
            </>
          ) : (
            'It has no todos. This can’t be undone.'
          )
        }
        confirmLabel="Delete sprint"
        pendingLabel="Deleting…"
        pending={deleteSprint.isPending}
        onConfirm={confirmDeleteSprint}
        fallbackFocus={pageTitle}
      />
    </div>
  );
}

/** Same layout as the page (DESIGN §11): the filter bar, then groups of 44px rows. */
function BacklogSkeleton() {
  return (
    <SkeletonRegion label="backlog" className={styles.backlog}>
      <div className={styles.filters}>
        <Skeleton inlineSize={240} blockSize={36} />
        <Skeleton inlineSize={140} blockSize={36} />
        <Skeleton inlineSize={124} blockSize={36} />
      </div>
      {[3, 5].map((rows, group) => (
        <div key={group} className={styles.group}>
          <div className={styles.groupHeader}>
            <Skeleton inlineSize={160} blockSize={20} />
          </div>
          <div className={styles.groupBody}>
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <Skeleton blockSize={16} opacity={1 - i * 0.15} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}
