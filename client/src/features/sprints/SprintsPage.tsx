import { Suspense, useCallback, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { Button, ButtonLink } from '@/components/Button/Button';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ProjectMeta } from '@/components/PageHeader/ProjectMeta';
import { Skeleton, SkeletonRegion } from '@/components/Skeleton/Skeleton';
import { SprintSummaryCard } from '@/features/ai/lazy';
import { useCurrentProject } from '@/hooks/useProjects';
import { useSprints } from '@/hooks/useSprints';
import { plural } from '@/lib/format';
import { useDelayedLoading } from '@/lib/useDelayedLoading';
import { toast } from '@/stores/toast';
import type { Sprint } from '@/types/api';
import { SprintDetail } from './SprintDetail';
import { SprintFormDialog } from './SprintFormDialog';
import { mostRecentSprint } from './sprintHistory';
import { SprintList } from './SprintList';
import styles from './Sprints.module.css';

/**
 * `/projects/:projectId/sprints/:sprintId?` (DESIGN §9 10; SPR-7): every sprint in a 380px list
 * next to the selected sprint's details (stacked below 864px). The selection is the URL; with no
 * `sprintId` the most recent sprint is shown (plan §9.3). An id that isn't one of this project's
 * sprints shows the page error until the 404 page (phase 8). Todo details opens from `?todo=`.
 */
export function SprintsPage() {
  const { projectId = '', sprintId } = useParams();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const { data: project } = useCurrentProject();
  const sprints = useSprints(projectId);
  const showSkeleton = useDelayedLoading(sprints.isPending);
  const [form, setForm] = useState({ open: false, key: 0 });

  const list = sprints.data;
  const selected = list && (sprintId ? list.find((sprint) => sprint.id === sprintId) : mostRecentSprint(list));

  const openTodo = useCallback(
    (todoId: string) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('todo', todoId);
        return next;
      });
    },
    [setParams],
  );

  const onCreated = (sprint: Sprint) => {
    setForm((state) => ({ ...state, open: false }));
    toast.success(`${sprint.name} created · drag todos into it from the backlog`);
    void navigate(`/projects/${projectId}/sprints/${sprint.id}`);
  };

  return (
    <div className="kb-page">
      <title>{project ? `Sprints · ${project.name} · Kanbot` : 'Sprints · Kanbot'}</title>
      <PageHeader
        title="Sprints"
        meta={
          <>
            <ProjectMeta project={project} />
            {list && <span className={styles.headerCount}>{plural(list.length, 'sprint')}</span>}
          </>
        }
        actions={
          <>
            <Button
              icon="add"
              disabled={!list}
              onClick={() => {
                setForm((state) => ({ open: true, key: state.key + 1 }));
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
          <SprintsSkeleton />
        ) : sprints.error ? (
          <PageError
            page="your sprints"
            error={sprints.error}
            onRetry={() => {
              void sprints.refetch();
            }}
            retrying={sprints.isRefetching}
          />
        ) : !list ? null : list.length === 0 ? (
          <EmptyState
            icon="sprint"
            title="No sprints yet"
            description="Plan a sprint from the backlog: create one, drag todos into it, then start it."
            actions={<ButtonLink to={`/projects/${projectId}/backlog`}>Go to Backlog</ButtonLink>}
          />
        ) : (
          <div className={styles.history}>
            <SprintList projectId={projectId} sprints={list} selectedId={selected?.id} />
            {selected ? (
              // Keyed, so the panel and its tiles play their entrance for each sprint.
              <SprintDetail
                key={selected.id}
                sprint={selected}
                onOpenTodo={openTodo}
                summary={
                  // AI-4: active and completed sprints (a planned one has nothing to summarize yet).
                  selected.status !== 'planned' && (
                    <Suspense fallback={null}>
                      <SprintSummaryCard sprint={selected} />
                    </Suspense>
                  )
                }
              />
            ) : (
              <PageError
                page="this sprint"
                className={styles.detailError}
                onRetry={() => {
                  void sprints.refetch();
                }}
                retrying={sprints.isRefetching}
              />
            )}
          </div>
        )}
      </div>

      {form.key > 0 && list && (
        <SprintFormDialog
          key={form.key}
          open={form.open}
          onOpenChange={(open) => {
            setForm((state) => ({ ...state, open }));
          }}
          projectId={projectId}
          sprint={null}
          sprints={list}
          onSaved={onCreated}
        />
      )}
    </div>
  );
}

/** Same layout as the page (DESIGN §11): list items on one side, the detail panel with four tiles. */
function SprintsSkeleton() {
  return (
    <SkeletonRegion label="sprints" className={styles.history}>
      <div className={styles.list}>
        {[1, 0.8, 0.6, 0.4].map((opacity) => (
          <Skeleton key={opacity} blockSize={76} radius="large" opacity={opacity} />
        ))}
      </div>
      <div className={styles.detail}>
        <Skeleton inlineSize={200} blockSize={24} />
        <Skeleton inlineSize={320} blockSize={16} />
        <div className={styles.stats}>
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} blockSize={74} radius="large" />
          ))}
        </div>
        <Skeleton blockSize={120} radius="large" opacity={0.6} />
      </div>
    </SkeletonRegion>
  );
}
