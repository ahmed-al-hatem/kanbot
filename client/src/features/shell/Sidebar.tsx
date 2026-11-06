import { NavLink, useMatch } from 'react-router';
import { Icon, type IconName } from '@/components/Icon/Icon';
import { Logo } from '@/components/Logo/Logo';
import { usePrefetchProject } from '@/hooks/useProjects';
import { useT, type Messages } from '@/i18n';
import { cx } from '@/lib/cx';
import { APP_NAME } from '@/lib/documentTitle';
import { prefetchChunk, type ProjectSection } from '@/routeChunks';
import { useNotFound } from '@/stores/notFound';
import { LanguageNavItem } from './LanguageNavItem';
import { ProfileMenu } from './ProfileMenu';
import { ProjectSwitcher } from './ProjectSwitcher';
import styles from './AppShell.module.css';

export const NAV_ID = 'main-nav';

const SECTIONS: { section: ProjectSection; label: (t: Messages) => string; icon: IconName }[] = [
  { section: 'backlog', label: (t) => t.shell.nav.backlog, icon: 'backlog' },
  { section: 'board', label: (t) => t.shell.nav.board, icon: 'board' },
  { section: 'sprints', label: (t) => t.shell.nav.sprints, icon: 'sprint' },
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
 * (only with a current project), Projects, the language item (with Arabic on), then profile and
 * theme. NavLink sets `aria-current="page"`; the active item gets the animated brand bar.
 */
export function Sidebar({ projectId, open }: SidebarProps) {
  const t = useT();
  const prefetch = usePrefetchProject();
  const sectionMatch = useMatch('/projects/:projectId/:section/*');
  const current = sectionMatch?.params.section;
  const section: ProjectSection = current === 'board' || current === 'sprints' ? current : 'backlog';
  // DESIGN §9 404: the sidebar stays, with no item current.
  const notFound = useNotFound((s) => s.cause !== null);
  const linkProps = { className: navClass(notFound), 'aria-current': notFound ? false : 'page' } as const;

  return (
    <nav id={NAV_ID} aria-label={t.shell.nav.label} className={cx(styles.nav, open && styles.navOpen)}>
      <div className={styles.brand}>
        <Logo size={28} />
        <span className={styles.wordmark} aria-hidden="true">
          {APP_NAME}
        </span>
      </div>

      <ProjectSwitcher projectId={projectId} section={section} />

      {projectId && (
        <>
          <p className={styles.navHeading}>{t.shell.nav.project}</p>
          <ul className={styles.navList}>
            {SECTIONS.map((item) => {
              const label = item.label(t);
              const path = `/projects/${projectId}/${item.section}`;
              return (
                <li key={item.section}>
                  <NavLink
                    to={path}
                    data-tip={label}
                    {...linkProps}
                    onPointerEnter={() => {
                      prefetch(projectId, item.section);
                    }}
                    onFocus={() => {
                      prefetch(projectId, item.section);
                    }}
                  >
                    <Icon name={item.icon} className={styles.navIcon} />
                    <span className={styles.navLabel}>{label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className={styles.navDivider} />
      <ul className={styles.navList}>
        <li>
          <NavLink
            to="/projects"
            end
            data-tip={t.shell.nav.projects}
            {...linkProps}
            onPointerEnter={() => {
              prefetchChunk('projects');
            }}
            onFocus={() => {
              prefetchChunk('projects');
            }}
          >
            <Icon name="spaces" className={styles.navIcon} />
            <span className={styles.navLabel}>{t.shell.nav.projects}</span>
          </NavLink>
        </li>
      </ul>

      <LanguageNavItem />
      <div className={styles.navFooter}>
        <ProfileMenu />
      </div>
    </nav>
  );
}
