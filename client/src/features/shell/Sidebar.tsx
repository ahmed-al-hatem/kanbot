import { NavLink, useMatch } from 'react-router';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { Logo } from '@/components/Logo/Logo';
import { usePrefetchProject } from '@/hooks/useProjects';
import { cx } from '@/lib/cx';
import { prefetchChunk, type ProjectSection } from '@/routeChunks';
import { useNotFound } from '@/stores/notFound';
import { ProfileMenu } from './ProfileMenu';
import { ProjectSwitcher } from './ProjectSwitcher';
import styles from './AppShell.module.css';

export const NAV_ID = 'main-nav';

const SECTIONS: { section: ProjectSection; label: string; icon: IconName }[] = [
  { section: 'backlog', label: 'Backlog', icon: 'backlog' },
  { section: 'board', label: 'Active Sprint', icon: 'board' },
  { section: 'sprints', label: 'Sprints', icon: 'sprint' },
];

const navClass =
  (notFound: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    cx(styles.navItem, isActive && !notFound && styles.navItemActive);

interface SidebarProps {
  projectId: string | undefined;
  /** Mobile: the hamburger opened it as a full-height panel (Esc is handled by the shell). */
  open: boolean;
}

/**
 * DESIGN §6 sidebar, `<nav aria-label="Main">`: logo, project switcher, the project's pages
 * (only with a current project), Projects, then profile and theme. NavLink sets
 * `aria-current="page"`; the active item gets the animated brand bar.
 */
export function Sidebar({ projectId, open }: SidebarProps) {
  const prefetch = usePrefetchProject();
  const sectionMatch = useMatch('/projects/:projectId/:section/*');
  const current = sectionMatch?.params.section;
  const section: ProjectSection = current === 'board' || current === 'sprints' ? current : 'backlog';
  // DESIGN §9 404: the sidebar stays, with no item current.
  const notFound = useNotFound((s) => s.cause !== null);
  const linkProps = { className: navClass(notFound), 'aria-current': notFound ? false : 'page' } as const;

  return (
    <nav id={NAV_ID} aria-label="Main" className={cx(styles.nav, open && styles.navOpen)}>
      <div className={styles.brand}>
        <Logo size={28} />
        <span className={styles.wordmark} aria-hidden="true">
          Kanbot
        </span>
      </div>

      <ProjectSwitcher projectId={projectId} section={section} />

      {projectId && (
        <>
          <p className={styles.navHeading}>Project</p>
          <ul className={styles.navList}>
            {SECTIONS.map((item) => (
              <li key={item.section}>
                <NavLink
                  to={`/projects/${projectId}/${item.section}`}
                  data-tip={item.label}
                  {...linkProps}
                  onPointerEnter={() => {
                    prefetch(projectId, item.section);
                  }}
                  onFocus={() => {
                    prefetch(projectId, item.section);
                  }}
                >
                  <Icon name={item.icon} className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.navDivider} />
      <ul className={styles.navList}>
        <li>
          <NavLink
            to="/projects"
            end
            data-tip="Projects"
            {...linkProps}
            onPointerEnter={() => {
              prefetchChunk('projects');
            }}
            onFocus={() => {
              prefetchChunk('projects');
            }}
          >
            <Icon name="spaces" className={styles.navIcon} />
            <span className={styles.navLabel}>Projects</span>
          </NavLink>
        </li>
      </ul>

      <div className={styles.navFooter}>
        <ProfileMenu />
      </div>
    </nav>
  );
}
