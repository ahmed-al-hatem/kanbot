import { NavLink, useMatch } from 'react-router';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { Logo } from '@/components/Logo/Logo';
import { usePrefetchProject } from '@/hooks/useProjects';
import { cx } from '@/lib/cx';
import { pageChunks, type ProjectSection } from '@/routeChunks';
import { ProfileMenu } from './ProfileMenu';
import { ProjectSwitcher } from './ProjectSwitcher';
import styles from './AppShell.module.css';

export const NAV_ID = 'main-nav';

const SECTIONS: { section: ProjectSection; label: string; icon: IconName }[] = [
  { section: 'backlog', label: 'Backlog', icon: 'backlog' },
  { section: 'board', label: 'Active Sprint', icon: 'board' },
  { section: 'sprints', label: 'Sprints', icon: 'sprint' },
];

const navClass = ({ isActive }: { isActive: boolean }) => cx(styles.navItem, isActive && styles.navItemActive);

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
                  className={navClass}
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
            className={navClass}
            onPointerEnter={() => void pageChunks.projects()}
            onFocus={() => void pageChunks.projects()}
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
