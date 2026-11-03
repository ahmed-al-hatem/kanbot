import { useNavigate } from 'react-router';
import { Icon } from '@/components/Icon/Icon';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/Menu/Menu';
import { ProjectAvatar } from '@/components/ProjectAvatar/ProjectAvatar';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { usePrefetchProject, useProject, useProjects } from '@/hooks/useProjects';
import type { ProjectSection } from '@/routeChunks';
import styles from './AppShell.module.css';

interface ProjectSwitcherProps {
  /** From the URL (PRJ-5); undefined on /projects. */
  projectId: string | undefined;
  /** Switching keeps the user on the same page of the other project. */
  section: ProjectSection;
}

/**
 * DESIGN §6 project switcher (PRJ-5): the current project's avatar, name and key; its menu
 * lists every project, then "View all projects". Items prefetch on hover/focus.
 */
export function ProjectSwitcher({ projectId, section }: ProjectSwitcherProps) {
  const navigate = useNavigate();
  const projects = useProjects();
  const current = useProject(projectId);
  const prefetch = usePrefetchProject();
  const project = current.data;

  const trigger = (
    <button
      type="button"
      className={styles.switcher}
      aria-label={project ? `Switch project, current: ${project.name}` : 'Choose a project'}
    >
      {project ? (
        <>
          <ProjectAvatar id={project.id} name={project.name} />
          <span className={styles.switcherText}>
            <span className={styles.switcherName}>{project.name}</span>
            <span className={styles.switcherKey}>{project.key}</span>
          </span>
        </>
      ) : projectId ? (
        <>
          <Skeleton inlineSize={24} blockSize={24} />
          <span className={styles.switcherText}>
            <Skeleton inlineSize={96} blockSize={12} />
          </span>
        </>
      ) : (
        <>
          <span className={styles.switcherIcon}>
            <Icon name="spaces" />
          </span>
          <span className={styles.switcherText}>
            <span className={styles.switcherName}>Choose a project</span>
          </span>
        </>
      )}
      <Icon name="chevron-down" className={styles.switcherChevron} />
    </button>
  );

  return (
    <Menu trigger={trigger} label="Projects" align="start" className={styles.switcherMenu}>
      <MenuLabel>Your projects</MenuLabel>
      {projects.isPending && <MenuItem disabled>Loading projects…</MenuItem>}
      {projects.isError && !projects.data && <MenuItem disabled>Couldn&apos;t load projects</MenuItem>}
      {projects.data?.length === 0 && <MenuItem disabled>No projects yet</MenuItem>}
      {projects.data?.map((item) => (
        <MenuItem
          key={item.id}
          onSelect={() => {
            void navigate(`/projects/${item.id}/${section}`);
          }}
          onFocus={() => {
            prefetch(item.id, section);
          }}
        >
          <span className={styles.menuProject}>
            <ProjectAvatar id={item.id} name={item.name} size={22} />
            <span className={styles.menuProjectName}>{item.name}</span>
            {item.id === projectId && <Icon name="check-mark" label="Current" className={styles.menuCurrent} />}
          </span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem
        icon="spaces"
        onSelect={() => {
          void navigate('/projects');
        }}
      >
        View all projects
      </MenuItem>
    </Menu>
  );
}
