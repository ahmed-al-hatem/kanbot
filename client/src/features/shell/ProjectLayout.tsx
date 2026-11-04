import { Outlet, useParams } from 'react-router';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { AiDialogsHost } from '@/features/ai/AiDialogsHost';
import { TodoDetailsHost } from '@/features/todos/TodoDetailsDialog';
import { useCurrentProject } from '@/hooks/useProjects';

/**
 * Layout for `/projects/:projectId/*`. The project comes from the URL (PRJ-5), so a reload
 * reopens it. An id the API doesn't know (404) or a failed load shows the page error; the
 * dedicated 404 page replaces it in phase 8. Todo details (`?todo=<id>`) is mounted here, so
 * every project page — the backlog now, the board in phase 6 — shares one dialog and deep link.
 * The AI dialogs (Generate todos, Plan sprint) are hosted here too, so a drawer chip opens them
 * on any project page.
 */
export function ProjectLayout() {
  const { projectId = '' } = useParams();
  const project = useCurrentProject();

  if (project.isError && !project.data) {
    return (
      <div className="kb-page">
        <title>Project · Kanbot</title>
        <PageHeader title="Project" />
        <div className="page-body">
          <PageError
            page="this project"
            error={project.error}
            onRetry={() => {
              void project.refetch();
            }}
            retrying={project.isRefetching}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Outlet />
      <TodoDetailsHost />
      <AiDialogsHost projectId={projectId} />
    </>
  );
}
