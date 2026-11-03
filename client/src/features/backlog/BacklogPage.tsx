import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ProjectMeta } from '@/components/PageHeader/ProjectMeta';
import { useCurrentProject } from '@/hooks/useProjects';

/** `/projects/:projectId/backlog`. Placeholder inside the shell until phase 4 builds the backlog. */
export function BacklogPage() {
  const { data: project } = useCurrentProject();
  return (
    <div className="kb-page">
      <title>{project ? `Backlog · ${project.name} · Kanbot` : 'Backlog · Kanbot'}</title>
      <PageHeader title="Backlog" meta={<ProjectMeta project={project} />} actions={<AskAiButton />} />
      <div className="page-body">
        <EmptyState
          icon="backlog"
          title="The backlog is on its way"
          description="Todos, filters and quick create arrive in the next update."
        />
      </div>
    </div>
  );
}
