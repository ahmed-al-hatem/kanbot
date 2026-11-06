import { useNavigate } from 'react-router';
import { Icon } from '@/components/Icon/Icon';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '@/components/Menu/Menu';
import { ProjectAvatar } from '@/components/ProjectAvatar/ProjectAvatar';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { usePrefetchProject, useProject, useProjects } from '@/hooks/useProjects';
import { useT } from '@/i18n';
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
  const t = useT();
  const navigate = useNavigate();
  const projects = useProjects();
  const current = useProject(projectId);
  const prefetch = usePrefetchProject();
  const project = current.data;

  const trigger = (
    <button
      type="button"
      className={styles.switcher}
      // The label contains all the visible text, name and key (WCAG 2.5.3 Label in Name): without
      // the key it failed axe's label-content-name-mismatch.
      aria-label={
        project ? t.shell.switcher.label(project.name, project.key) : t.shell.switcher.choose
      }
      // The tablet rail's tooltip (AppShell.module.css).
      data-tip={project ? project.name : t.shell.switcher.choose}
    >
      {project ? (
        <>
          <ProjectAvatar id={project.id} name={project.name} />
          <span className={styles.switcherText}>
            {/* The spaces keep name and key separate words for axe's visible text (a flex
                container doesn't render whitespace-only text, so the layout is unchanged). */}
            <span className={styles.switcherName}>{project.name}</span>{' '}
            <span className={styles.switcherKey}>{project.key}</span>{' '}
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
            <span className={styles.switcherName}>{t.shell.switcher.choose}</span>
          </span>
        </>
      )}
      <Icon name="chevron-down" className={styles.switcherChevron} />
    </button>
  );

  return (
    <Menu
      trigger={trigger}
      label={t.shell.switcher.menu}
      align="start"
      className={styles.switcherMenu}
    >
      <MenuLabel>{t.shell.switcher.heading}</MenuLabel>
      {projects.isPending && <MenuItem disabled>{t.shell.switcher.loading}</MenuItem>}
      {projects.isError && !projects.data && (
        <MenuItem disabled>{t.shell.switcher.loadFailed}</MenuItem>
      )}
      {projects.data?.length === 0 && <MenuItem disabled>{t.shell.switcher.empty}</MenuItem>}
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
            {item.id === projectId && (
              <Icon
                name="check-mark"
                label={t.shell.switcher.current}
                className={styles.menuCurrent}
              />
            )}
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
        {t.shell.switcher.viewAll}
      </MenuItem>
    </Menu>
  );
}
