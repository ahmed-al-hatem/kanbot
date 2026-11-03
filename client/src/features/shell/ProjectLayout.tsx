import { Outlet } from 'react-router';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { useCurrentProject } from '@/hooks/useProjects';

/**
 * Layout for `/projects/:projectId/*`. The project comes from the URL (PRJ-5), so a reload
 * reopens it. An id the API doesn't know (404) or a failed load shows the page error; the
 * dedicated 404 page replaces it in phase 8.
 */
export function ProjectLayout() {
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

  return <Outlet />;
}
