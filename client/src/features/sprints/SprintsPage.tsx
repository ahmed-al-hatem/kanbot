import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ProjectMeta } from '@/components/PageHeader/ProjectMeta';
import { useCurrentProject } from '@/hooks/useProjects';

/** `/projects/:projectId/sprints/:sprintId?`. Placeholder inside the shell until phase 6. */
export function SprintsPage() {
  const { data: project } = useCurrentProject();
  return (
    <div className="kb-page">
      <title>{project ? `Sprints · ${project.name} · Kanbot` : 'Sprints · Kanbot'}</title>
      <PageHeader title="Sprints" meta={<ProjectMeta project={project} />} actions={<AskAiButton />} />
      <div className="page-body">
        <EmptyState
          icon="sprint"
          title="Sprint history is on its way"
          description="Past sprints, their stats and AI summaries arrive in a later update."
        />
      </div>
    </div>
  );
}
