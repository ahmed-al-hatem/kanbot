import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { Button } from '@/components/Button/Button';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ProjectMeta } from '@/components/PageHeader/ProjectMeta';
import { Skeleton, SkeletonRegion } from '@/components/Skeleton/Skeleton';
import { todoNeighbourFocus } from '@/features/todos/todoFocus';
import { useRemoveTodo } from '@/features/todos/useRemoveTodo';
import { useBacklog } from '@/hooks/useBacklog';
import { useCurrentProject } from '@/hooks/useProjects';
import { todosAndPoints } from '@/lib/format';
import { useDelayedLoading } from '@/lib/useDelayedLoading';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import type { Todo } from '@/types/api';
import styles from './Backlog.module.css';
import { BacklogGroup } from './BacklogGroup';
import { isFiltering, matchesFilters, readFilters, writeFilters, type BacklogFilters } from './backlogFilters';
import { FilterBar } from './FilterBar';
import { QuickCreate } from './QuickCreate';
import { ROW_HELP_ID } from './TodoRow';

interface DeleteState {
  open: boolean;
  todo: Todo | null;
  /** Neighbour captured when the confirm opened, for when the row is gone on close. */
  focus: (() => HTMLElement | null) | undefined;
}

/**
 * `/projects/:projectId/backlog` (DESIGN §9 04, BL-1, BL-2, BL-4, BL-6): the active sprint,
 * the planned sprints and the Backlog, each with count and points; filters in the URL; quick
 * create; row menu with Open and Delete. Todo details opens from `?todo=` (project layout).
 * Moves, reordering and sprint actions are phase 5.
 */
export function BacklogPage() {
  const { projectId = '' } = useParams();
  const { data: project } = useCurrentProject();
  const backlog = useBacklog(projectId);
  const showSkeleton = useDelayedLoading(backlog.isPending);
  const [params, setParams] = useSearchParams();
  const urlFilters = readFilters(params);
  // Filtering a long list never blocks typing: the rows follow a moment later (plan §5.5).
  const q = useDeferredValue(urlFilters.q);
  const highlightIds = useHighlight((s) => s.todoIds);
  const removeTodo = useRemoveTodo();
  const quickCreateRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [toDelete, setToDelete] = useState<DeleteState>({ open: false, todo: null, focus: undefined });

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
        actions={<AskAiButton />}
      />

      <div className="page-body">
        {showSkeleton ? (
          <BacklogSkeleton />
        ) : backlog.error ? (
          <PageError page="the backlog" error={backlog.error} onRetry={backlog.refetch} retrying={backlog.isRefetching} />
        ) : !groups || !visible ? null : (
          <div className={styles.backlog}>
            <FilterBar filters={urlFilters} onChange={updateFilters} onClear={clearFilters} shown={shown} total={total} />

            {groups.map((group, index) => (
              <BacklogGroup
                key={group.id}
                group={group}
                visible={visible[index] ?? []}
                filtering={filtering}
                collapsed={Boolean(collapsed[group.id])}
                onToggle={toggleGroup}
                highlightIds={highlightIds}
                onOpen={openTodo}
                onDelete={askDelete}
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
                              toast.info('Generating todos with AI arrives in a later update.');
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

            <span id={ROW_HELP_ID} className="visually-hidden">
              Press Enter to open its details.
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
