import { DndContext, DragOverlay, MeasuringStrategy } from '@dnd-kit/core';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { Button, ButtonLink } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ProjectMeta } from '@/components/PageHeader/ProjectMeta';
import { Skeleton, SkeletonRegion } from '@/components/Skeleton/Skeleton';
import { StartSprintDialog } from '@/features/sprints/StartSprintDialog';
import { useBoard } from '@/hooks/useBoard';
import { useCurrentProject } from '@/hooks/useProjects';
import { useSprints } from '@/hooks/useSprints';
import { useDragSensors } from '@/lib/dnd/sensors';
import { useListsDnd } from '@/lib/dnd/useListsDnd';
import { plural } from '@/lib/format';
import { useDelayedLoading } from '@/lib/useDelayedLoading';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import type { Sprint } from '@/types/api';
import styles from './Board.module.css';
import { BoardColumn } from './BoardColumn';
import { columnsOf } from './columns';
import { CompleteSprintDialog, type Completed } from './CompleteSprintDialog';
import { SprintHeader } from './SprintHeader';
import { CARD_HELP_ID, TodoCardPreview } from './TodoCard';
import { useBoardMoves } from './useBoardMoves';

// dnd-kit re-measures while dragging, so a column that grows as a card joins it still takes drops.
const MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };
// The board has no keyboard drag sensor (the arrows on a focused card move it), so this is
// only what dnd-kit would say about a draggable; the cards describe their own keys.
const DRAG_INSTRUCTIONS = {
  draggable: 'Focus a card and use the arrow keys to move it between columns or reorder it.',
};

/**
 * `/projects/:projectId/board` (DESIGN §9 05; SPR-4…6). The active sprint's id comes from
 * `project.stats.activeSprint`, which the project layout already loaded, so the board request
 * starts at once (no waiting for the sprint list — plan §5.3). Header with progress, four
 * columns with drag and drop, arrow keys and ⋯ "Move to…", a composer per column, Complete
 * sprint, and the "No active sprint" empty state. Todo details opens from `?todo=` (layout).
 */
export function BoardPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const project = useCurrentProject();
  const activeId = project.data?.stats.activeSprint?.id;
  const board = useBoard(activeId);
  const { data: sprints } = useSprints(projectId);
  const highlightIds = useHighlight((s) => s.todoIds);
  const reducedMotion = useReducedMotion();
  // `key` remounts the dialog on every open, so it starts from the Backlog choice again.
  const [complete, setComplete] = useState({ open: false, key: 0 });
  const [toStart, setToStart] = useState<{ open: boolean; sprint: Sprint | null }>({ open: false, sprint: null });

  const loading = project.data ? Boolean(activeId) && board.isPending : project.isPending;
  const showSkeleton = useDelayedLoading(loading);
  const columns = useMemo(() => (board.data ? columnsOf(board.data) : undefined), [board.data]);
  const sprint = board.data?.sprint;
  const planned = useMemo(() => sprints?.filter((item) => item.status === 'planned') ?? [], [sprints]);
  const nextPlanned = planned[0];

  const { moveTo, onKeyMove, onMenuMove } = useBoardMoves(projectId, activeId, columns);
  const sensors = useDragSensors({ keyboard: false });
  const dnd = useListsDnd(columns, moveTo, { sensors, instructions: DRAG_INSTRUCTIONS });

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

  /** SPR-6: toast (a status region, so it is announced), then the sprint's page in the history. */
  const onCompleted = ({ sprint: done, destination, moved }: Completed) => {
    setComplete((state) => ({ ...state, open: false }));
    toast.success(moved > 0 ? `${done.name} completed · ${plural(moved, 'todo')} moved to ${destination}` : `${done.name} completed`);
    void navigate(`/projects/${projectId}/sprints/${done.id}`);
  };

  /** DESIGN §9 05 "Start <next planned sprint>", with the backlog's rule that an empty sprint can't start. */
  const askStart = (next: Sprint) => {
    if (next.stats.totalTodos === 0) {
      toast.error(`Add todos to ${next.name} before starting it.`, {
        action: {
          label: 'Go to Backlog',
          onClick: () => {
            void navigate(`/projects/${projectId}/backlog`);
          },
        },
      });
      return;
    }
    setToStart({ open: true, sprint: next });
  };
  const onStarted = (started: Sprint) => {
    setToStart((state) => ({ ...state, open: false }));
    toast.success(`${started.name} started`);
  };

  const noActive = project.data !== undefined && !activeId;

  return (
    <div className="kb-page">
      <title>{project.data ? `Active Sprint · ${project.data.name} · Kanbot` : 'Active Sprint · Kanbot'}</title>
      <PageHeader
        title="Active Sprint"
        meta={<ProjectMeta project={project.data} />}
        actions={
          <>
            <AskAiButton />
            {sprint && (
              <Button
                variant="primary"
                onClick={() => {
                  setComplete((state) => ({ open: true, key: state.key + 1 }));
                }}
              >
                Complete sprint
              </Button>
            )}
          </>
        }
      />

      <div className="page-body">
        {showSkeleton ? (
          <BoardSkeleton />
        ) : noActive ? (
          <EmptyState
            icon="sprint"
            title="No active sprint"
            description="Start a planned sprint from the backlog to see its board here."
            actions={
              <>
                <ButtonLink to={`/projects/${projectId}/backlog`}>Go to Backlog</ButtonLink>
                {nextPlanned && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      askStart(nextPlanned);
                    }}
                  >
                    Start {nextPlanned.name}
                  </Button>
                )}
              </>
            }
          />
        ) : board.error ? (
          <PageError
            page="the active sprint"
            error={board.error}
            onRetry={() => {
              void board.refetch();
            }}
            retrying={board.isRefetching}
          />
        ) : !sprint || !columns ? null : (
          <>
            <SprintHeader sprint={sprint} />
            <p className={styles.moveHelp}>
              Drag cards between columns, or focus a card and use <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> to
              move it.
            </p>
            <div className={styles.boardScroll}>
              <DndContext {...dnd.contextProps} measuring={MEASURING}>
                <div className={styles.boardGrid}>
                  {columns.map((column, index) => (
                    <BoardColumn
                      key={column.id}
                      column={column}
                      index={index}
                      cards={dnd.previewRows(column.id) ?? column.todos}
                      isOver={dnd.overList === column.id}
                      highlightIds={highlightIds}
                      projectId={projectId}
                      sprintId={sprint.id}
                      onOpen={openTodo}
                      onKeyMove={onKeyMove}
                      onMove={onMenuMove}
                    />
                  ))}
                </div>
                {createPortal(
                  // Reduced motion: the card lands where it is dropped, without the fly-back (plan §9.6).
                  <DragOverlay dropAnimation={reducedMotion ? null : undefined}>
                    {dnd.activeTodo && <TodoCardPreview todo={dnd.activeTodo} />}
                  </DragOverlay>,
                  document.body,
                )}
              </DndContext>
            </div>
            <span id={CARD_HELP_ID} className="visually-hidden">
              Press Enter to open its details. Press the left and right arrow keys to move it to another column, and the up
              and down arrow keys to reorder it.
            </span>
          </>
        )}
      </div>

      {sprint && complete.key > 0 && (
        <CompleteSprintDialog
          key={complete.key}
          open={complete.open}
          onOpenChange={(open) => {
            setComplete((state) => ({ ...state, open }));
          }}
          projectId={projectId}
          sprint={sprint}
          planned={planned}
          onCompleted={onCompleted}
        />
      )}

      {toStart.sprint && (
        <StartSprintDialog
          key={toStart.sprint.id}
          open={toStart.open}
          onOpenChange={(open) => {
            setToStart((state) => ({ ...state, open }));
          }}
          projectId={projectId}
          sprint={toStart.sprint}
          todoCount={toStart.sprint.stats.totalTodos}
          points={toStart.sprint.stats.totalPoints}
          onStarted={onStarted}
        />
      )}
    </div>
  );
}

/** Same layout as the page (DESIGN §11, artboard S03): the sprint header, then four columns of cards. */
function BoardSkeleton() {
  return (
    <SkeletonRegion label="active sprint">
      <div className={styles.sprintHeader}>
        <Skeleton inlineSize={220} blockSize={24} />
        <Skeleton inlineSize={360} blockSize={16} />
        <Skeleton inlineSize={420} blockSize={8} radius="full" />
      </div>
      <div className={styles.boardScroll}>
        <div className={styles.boardGrid}>
          {[3, 2, 2, 1].map((cards, column) => (
            <div key={column} className={styles.column}>
              <div className={styles.columnHeader}>
                <Skeleton inlineSize={96} blockSize={16} />
              </div>
              {Array.from({ length: cards }, (_, i) => (
                <Skeleton key={i} blockSize={104} radius="xlarge" opacity={1 - i * 0.3} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}
