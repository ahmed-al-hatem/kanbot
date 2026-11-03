import { AskAiButton } from '@/components/AskAiButton/AskAiButton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { ProjectMeta } from '@/components/PageHeader/ProjectMeta';
import { useCurrentProject } from '@/hooks/useProjects';

/** `/projects/:projectId/board`. Placeholder inside the shell until phase 6 builds the board. */
export function BoardPage() {
  const { data: project } = useCurrentProject();
  const activeSprint = project?.stats.activeSprint;
  return (
    <div className="kb-page">
      <title>{project ? `Active Sprint · ${project.name} · Kanbot` : 'Active Sprint · Kanbot'}</title>
      <PageHeader title="Active Sprint" meta={<ProjectMeta project={project} />} actions={<AskAiButton />} />
      <div className="page-body">
        <EmptyState
          icon="board"
          title="The board is on its way"
          description={
            activeSprint
              ? `${activeSprint.name} is active. Its columns and cards arrive in a later update.`
              : 'The active sprint board arrives in a later update.'
          }
        />
      </div>
    </div>
  );
}
