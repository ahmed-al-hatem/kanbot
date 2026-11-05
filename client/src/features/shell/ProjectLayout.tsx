import { Outlet, useParams, useSearchParams } from 'react-router';
import { isNotFoundError } from '@/api/errors';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { AiDialogsHost } from '@/features/ai/AiDialogsHost';
import { NotFoundPage } from '@/features/errors/NotFoundPage';
import { TodoDetailsHost } from '@/features/todos/TodoDetailsDialog';
import { useCurrentProject } from '@/hooks/useProjects';
import { useTodo } from '@/hooks/useTodos';
import { titleOf, useDocumentTitle } from '@/lib/documentTitle';

/**
 * Layout for `/projects/:projectId/*`. The project comes from the URL (PRJ-5), so a reload
 * reopens it. An id the API answers 404 for (missing, or another user's) shows the 404 page,
 * and so does a `?todo=` that doesn't exist or belongs to another project (DESIGN §9); any
 * other failure shows the page error. Todo details (`?todo=<id>`) is mounted here, so every
 * project page shares one dialog and deep link. The AI dialogs (Generate todos, Plan sprint)
 * are hosted here too, so a drawer chip opens them on any project page.
 */
export function ProjectLayout() {
  const { projectId = '' } = useParams();
  const [params] = useSearchParams();
  const todoId = params.get('todo');
  const project = useCurrentProject();
  // The same query Todo details uses: seeded from the cached lists, fetched for a cold deep link.
  const todo = useTodo(todoId);

  if (project.isError && !project.data) {
    if (isNotFoundError(project.error)) return <NotFoundPage cause="project" />;
    return <ProjectError project={project} />;
  }

  const todoMissing =
    todoId !== null && (todo.data ? todo.data.projectId !== projectId : isNotFoundError(todo.error));
  if (todoMissing) return <NotFoundPage cause="todo" />;

  return (
    <>
      <Outlet />
      <TodoDetailsHost />
      <AiDialogsHost projectId={projectId} />
    </>
  );
}

function ProjectError({ project }: { project: ReturnType<typeof useCurrentProject> }) {
  useDocumentTitle(titleOf('Project'));
  return (
    <div className="kb-page">
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
