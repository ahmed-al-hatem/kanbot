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
  const navigate = useNavigate();
  const projects = useProjects();
  const removeProject = useDeleteProject();
  const prefetch = usePrefetchProject();
  const showSkeleton = useDelayedLoading(projects.isPending);
  const [search, setSearch] = useSearchParams();
  const query = search.get('q') ?? '';
  const highlightId = useHighlight((s) => s.projectId);
  const markHighlight = useHighlight((s) => s.markProject);
  const clearHighlight = useHighlight((s) => s.clearProject);
  const [form, setForm] = useState<FormState>({ open: false, project: null, session: 0 });
  const [toDelete, setToDelete] = useState<DeleteState>({ open: false, project: null, focus: undefined });

  const list = projects.data;
  const needle = query.trim().toLowerCase();
  const shown = list && needle ? list.filter((project) => matches(project, needle)) : list;
  const highlightShown = Boolean(highlightId && shown?.some((project) => project.id === highlightId));

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
  const openEdit = useCallback((project: ProjectWithStats) => {
    setForm((state) => ({ open: true, project, session: state.session + 1 }));
  }, [setForm]);
  const askDelete = useCallback((project: ProjectWithStats) => {
    setToDelete({ open: true, project, focus: projectNeighbourFocus(project.id) });
  }, [setToDelete]);

  const onSaved = (saved: ProjectWithStats, { starter }: { starter: boolean }) => {
    setForm((state) => ({ ...state, open: false }));
    if (form.project) {
      toast.success(`${saved.name} updated`);
      return;
    }
    toast.success(`${saved.name} created`);
    markHighlight(saved.id);
    // Plan §9.4: the starter backlog is Generate todos on the new backlog, pre-filled from the
    // description — the user reviews the drafts; nothing is added until they click Add.
    if (starter) useAssistant.getState().openDialog({ kind: 'generate', projectId: saved.id, prompt: starterPrompt(saved) });
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
        toast.success(`${project.name} deleted`);
        // PRJ-4: back to the projects list (already here when deleting from a tile).
        void navigate({ pathname: '/projects', search: search.toString() }, { replace: true });
      },
      onError: (error) => {
        toast.error(`Couldn't delete ${project.name}. ${isApiError(error) ? error.message : 'Please try again.'}`);
      },
    });
  };

  const count = list?.length;
  const deleting = toDelete.project;
  const todoCount = deleting?.stats.totalTodos ?? 0;

  return (
    <div className="kb-page">
      <title>Projects · Kanbot</title>
      <PageHeader
        title="Projects"
        meta={count === undefined ? undefined : count === 1 ? '1 project' : `${count} projects`}
        actions={
          <Button variant="primary" icon="add" onClick={openCreate} data-new-project>
            New project
          </Button>
        }
      />

      <div className="page-body">
        {showSkeleton ? (
          <SkeletonRegion label="projects" className={styles.skeleton}>
            <Skeleton inlineSize={320} blockSize={36} className={styles.skeletonSearch} />
            <div className={styles.grid}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} blockSize={176} radius="xlarge" />
              ))}
            </div>
          </SkeletonRegion>
        ) : projects.isError && !list ? (
          <PageError
            page="your projects"
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
            title="No projects yet"
            description="Create your first project to start planning sprints."
            actions={
              <Button variant="primary" icon="add" onClick={openCreate}>
                Create your first project
              </Button>
            }
          />
        ) : (
          <>
            <div className={styles.search}>
              <label htmlFor="project-search" className="visually-hidden">
                Search projects
              </label>
              <Icon name="search" className={styles.searchIcon} />
              <Input
                id="project-search"
                type="search"
                className={styles.searchInput}
                placeholder="Search by name or key"
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
                title={`No projects match “${query.trim()}”`}
                actions={
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setQuery('');
                    }}
                  >
                    Clear search
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
                  New project
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
        title={`Delete ${deleting?.name ?? 'project'}?`}
        description={
          <>
            This permanently deletes <b>{deleting?.name}</b> ({deleting?.key}) with all of its sprints
            {todoCount > 0 ? ` and its ${todoCount === 1 ? '1 todo' : `${todoCount} todos`}` : ' and todos'}. This
            can&apos;t be undone.
          </>
        }
        confirmLabel="Delete project"
        onConfirm={confirmDelete}
        fallbackFocus={toDelete.focus}
      />
    </div>
  );
}

/** The canvas "No projects yet" drawing: three columns and the AI dot. Colors are tokens. */
function EmptyIllustration() {
  return (
    <svg width="120" height="88" viewBox="0 0 120 88" fill="none" aria-hidden="true" focusable="false">
      <rect x="4" y="8" width="32" height="76" rx="6" fill="var(--neutral-hover)" />
      <rect x="44" y="8" width="32" height="52" rx="6" fill="var(--neutral-hover)" />
      <rect x="84" y="8" width="32" height="32" rx="6" fill="var(--lz-green-bg)" />
      <rect x="10" y="16" width="20" height="14" rx="3" fill="var(--surface-raised)" />
      <rect x="50" y="16" width="20" height="14" rx="3" fill="var(--surface-raised)" />
      <circle cx="100" cy="24" r="6" fill="var(--ai-icon)" />
    </svg>
  );
}

/** The Generate todos description for a new project: its description, or a line from its name. */
function starterPrompt(project: ProjectWithStats): string {
  const description = project.description.trim();
  return description.length >= 3 ? description : `First todos for a new project called "${project.name}"`;
}
