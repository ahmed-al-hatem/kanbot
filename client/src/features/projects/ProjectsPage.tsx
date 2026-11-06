import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { isApiError } from '@/api/errors';
import { Button } from '@/components/Button/Button';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Input } from '@/components/Field/Input';
import { Icon } from '@/components/Icon/Icon';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { Skeleton, SkeletonRegion } from '@/components/Skeleton/Skeleton';
import { useDeleteProject, usePrefetchProject, useProjects } from '@/hooks/useProjects';
import { getT, useT, type Messages } from '@/i18n';
import { errorMessage } from '@/i18n/errors';
import { titleOf, useDocumentTitle } from '@/lib/documentTitle';
import { neighbourFocus, refocusAfterRemoval } from '@/lib/refocus';
import { useDelayedLoading } from '@/lib/useDelayedLoading';
import { useAssistant } from '@/stores/assistant';
import { useHighlight } from '@/stores/highlight';
import { toast } from '@/stores/toast';
import type { ProjectWithStats } from '@/types/api';
import { ProjectFormDialog } from './ProjectFormDialog';
import { ProjectTile } from './ProjectTile';
import styles from './ProjectsPage.module.css';

/** How long a new tile keeps its highlight class (DESIGN §8.2 "New or moved row": 1300ms). */
const HIGHLIGHT_MS = 1400;

/** Dialogs stay mounted while closing so they can animate out; `session` remounts the form on each open. */
interface FormState {
  open: boolean;
  project: ProjectWithStats | null;
  session: number;
}

interface DeleteState {
  open: boolean;
  project: ProjectWithStats | null;
  /** Captured when the confirm opens, while the tile is still there. */
  focus: (() => HTMLElement | null) | undefined;
}

/**
 * After a delete the ⋯ that had focus leaves with its tile: focus the next tile, the
 * previous one, then the New project button.
 */
function projectNeighbourFocus(projectId: string) {
  return neighbourFocus('data-project-focus', projectId, ['[data-new-project]', '.page-title']);
}

function matches(project: ProjectWithStats, needle: string) {
  return project.name.toLowerCase().includes(needle) || project.key.toLowerCase().includes(needle);
}

/**
 * `/projects` (DESIGN §9 03, PRJ-1…4): the grid of tiles with local search by name or key
 * (kept in `?q=`), the new-project tile, empty / no-match / loading / error states, and the
 * create, edit and delete dialogs.
 */
export function ProjectsPage() {
  const t = useT();
  const navigate = useNavigate();
  const projects = useProjects();
  useDocumentTitle(titleOf(t.projects.title));
  const removeProject = useDeleteProject();
  const prefetch = usePrefetchProject();
  const showSkeleton = useDelayedLoading(projects.isPending);
  const [search, setSearch] = useSearchParams();
  const query = search.get('q') ?? '';
  const highlightId = useHighlight((s) => s.projectId);
  const markHighlight = useHighlight((s) => s.markProject);
  const clearHighlight = useHighlight((s) => s.clearProject);
  const [form, setForm] = useState<FormState>({ open: false, project: null, session: 0 });
  const [toDelete, setToDelete] = useState<DeleteState>({
    open: false,
    project: null,
    focus: undefined,
  });

  const list = projects.data;
  const needle = query.trim().toLowerCase();
  const shown = list && needle ? list.filter((project) => matches(project, needle)) : list;
  const highlightShown = Boolean(
    highlightId && shown?.some((project) => project.id === highlightId),
  );

  // The highlight plays once: cleared after its animation, once the tile is actually on screen.
  useEffect(() => {
    if (!highlightId || !highlightShown) return;
    const timer = setTimeout(() => {
      clearHighlight(highlightId);
    }, HIGHLIGHT_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [highlightId, highlightShown, clearHighlight]);

  const setQuery = (value: string) => {
    setSearch(
      (params) => {
        const next = new URLSearchParams(params);
        if (value) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  };

  const openCreate = () => {
    setForm((state) => ({ open: true, project: null, session: state.session + 1 }));
  };
  const openEdit = useCallback(
    (project: ProjectWithStats) => {
      setForm((state) => ({ open: true, project, session: state.session + 1 }));
    },
    [setForm],
  );
  const askDelete = useCallback(
    (project: ProjectWithStats) => {
      setToDelete({ open: true, project, focus: projectNeighbourFocus(project.id) });
    },
    [setToDelete],
  );

  const onSaved = (saved: ProjectWithStats, { starter }: { starter: boolean }) => {
    setForm((state) => ({ ...state, open: false }));
    if (form.project) {
      toast.success(getT().projects.toast.updated(saved.name));
      return;
    }
    toast.success(getT().projects.toast.created(saved.name));
    markHighlight(saved.id);
    // Plan §9.4: the starter backlog is Generate todos on the new backlog, pre-filled from the
    // description — the user reviews the drafts; nothing is added until they click Add.
    if (starter)
      useAssistant
        .getState()
        .openDialog({
          kind: 'generate',
          projectId: saved.id,
          prompt: starterPrompt(saved, getT()),
        });
    // PRJ-2: a new project opens on its backlog.
    void navigate(`/projects/${saved.id}/backlog`);
  };

  const confirmDelete = () => {
    const project = toDelete.project;
    if (!project) return;
    // Optimistic (plan §10 decision 2): the tile goes now and comes back if the request fails.
    setToDelete((state) => ({ ...state, open: false }));
    if (toDelete.focus) refocusAfterRemoval(toDelete.focus);
    removeProject.mutate(project, {
      onSuccess: () => {
        toast.success(getT().projects.toast.deleted(project.name));
        // PRJ-4: back to the projects list (already here when deleting from a tile).
        void navigate({ pathname: '/projects', search: search.toString() }, { replace: true });
      },
      onError: (error) => {
        const messages = getT();
        const reason = isApiError(error)
          ? errorMessage(error, messages)
          : messages.common.pleaseTryAgain;
        toast.error(messages.projects.toast.deleteFailed(project.name, reason));
      },
    });
  };

  const count = list?.length;
  const deleting = toDelete.project;
  const todoCount = deleting?.stats.totalTodos ?? 0;

  return (
    <div className="kb-page">
      <PageHeader
        title={t.projects.title}
        meta={count === undefined ? undefined : t.count.projects(count)}
        actions={
          <Button
            variant="primary"
            icon="add"
            onClick={openCreate}
            data-new-project
            data-shortcut="create"
          >
            {t.projects.newProject}
          </Button>
        }
      />

      <div className="page-body">
        {showSkeleton ? (
          <SkeletonRegion label={t.projects.loadingName} className={styles.skeleton}>
            <Skeleton inlineSize={320} blockSize={36} className={styles.skeletonSearch} />
            <div className={styles.grid}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} blockSize={176} radius="xlarge" />
              ))}
            </div>
          </SkeletonRegion>
        ) : projects.isError && !list ? (
          <PageError
            page={t.projects.pageName}
            error={projects.error}
            onRetry={() => {
              void projects.refetch();
            }}
            retrying={projects.isRefetching}
            backTo={false}
          />
        ) : !list || !shown ? null : list.length === 0 ? (
          <EmptyState
            illustration={<EmptyIllustration />}
            title={t.projects.empty.title}
            description={t.projects.empty.text}
            actions={
              <Button variant="primary" icon="add" onClick={openCreate}>
                {t.projects.empty.action}
              </Button>
            }
          />
        ) : (
          <>
            <div className={styles.search}>
              <label htmlFor="project-search" className="visually-hidden">
                {t.projects.search.label}
              </label>
              <Icon name="search" className={styles.searchIcon} />
              <Input
                id="project-search"
                type="search"
                data-shortcut="search"
                className={styles.searchInput}
                placeholder={t.projects.search.placeholder}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
              />
            </div>

            {shown.length === 0 ? (
              <EmptyState
                variant="dashed"
                icon="search"
                title={t.projects.search.noMatch(query.trim())}
                actions={
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setQuery('');
                    }}
                  >
                    {t.common.clearSearch}
                  </Button>
                }
              />
            ) : (
              <div className={styles.grid}>
                {shown.map((project, index) => (
                  <ProjectTile
                    key={project.id}
                    project={project}
                    index={index}
                    highlighted={project.id === highlightId}
                    onEdit={openEdit}
                    onDelete={askDelete}
                    onPrefetch={prefetch}
                  />
                ))}
                <button
                  type="button"
                  className={styles.newTile}
                  style={{ animationDelay: `${Math.min(shown.length, 6) * 45}ms` }}
                  onClick={openCreate}
                >
                  <span className={styles.newTileIcon}>
                    <Icon name="add" />
                  </span>
                  {t.projects.newProject}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ProjectFormDialog
        key={form.session}
        open={form.open}
        onOpenChange={(open) => {
          setForm((state) => ({ ...state, open }));
        }}
        project={form.project}
        takenKeys={list?.map((project) => project.key) ?? []}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={toDelete.open}
        onOpenChange={(open) => {
          setToDelete((state) => ({ ...state, open }));
        }}
        title={t.projects.delete.title(deleting?.name ?? t.projects.delete.fallbackName)}
        description={
          <>
            {t.projects.delete.before}
            <b>{deleting?.name}</b>
            {t.projects.delete.after(deleting?.key ?? '', todoCount)}
          </>
        }
        confirmLabel={t.projects.delete.confirm}
        onConfirm={confirmDelete}
        fallbackFocus={toDelete.focus}
      />
    </div>
  );
}

/** The canvas "No projects yet" drawing: three columns and the AI dot. Colors are tokens. */
const ILLUSTRATION = {
  viewBox: '0 0 120 88',
  rects: [
    { x: 4, y: 8, width: 32, height: 76, rx: 6, fill: 'var(--neutral-hover)' },
    { x: 44, y: 8, width: 32, height: 52, rx: 6, fill: 'var(--neutral-hover)' },
    { x: 84, y: 8, width: 32, height: 32, rx: 6, fill: 'var(--lz-green-bg)' },
    { x: 10, y: 16, width: 20, height: 14, rx: 3, fill: 'var(--surface-raised)' },
    { x: 50, y: 16, width: 20, height: 14, rx: 3, fill: 'var(--surface-raised)' },
  ],
  dot: { cx: 100, cy: 24, r: 6, fill: 'var(--ai-icon)' },
} as const;

function EmptyIllustration() {
  const { viewBox, rects, dot } = ILLUSTRATION;
  return (
    <svg width={120} height={88} viewBox={viewBox} fill="none" aria-hidden focusable={false}>
      {rects.map((rect, index) => (
        <rect key={index} {...rect} />
      ))}
      <circle {...dot} />
    </svg>
  );
}

/** The Generate todos description for a new project: its description, or a line from its name. */
function starterPrompt(project: ProjectWithStats, t: Messages): string {
  const description = project.description.trim();
  return description.length >= 3 ? description : t.projects.form.starterPrompt(project.name);
}
