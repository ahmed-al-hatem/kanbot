import { Lozenge } from '@/components/Lozenge/Lozenge';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import type { ProjectWithStats } from '@/types/api';

/** Page-header meta on project pages: the project's name and key lozenge (a skeleton while loading). */
export function ProjectMeta({ project }: { project: ProjectWithStats | undefined }) {
  if (!project) return <Skeleton inlineSize={120} blockSize={14} />;
  return (
    <>
      {project.name}
      <Lozenge>{project.key}</Lozenge>
    </>
  );
}
