import { Avatar } from '@/components/Avatar/Avatar';
import { IconButton } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { Menu, MenuItem, MenuLabel } from '@/components/Menu/Menu';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useT } from '@/i18n';
import { useShortcuts } from '@/stores/shortcuts';
import { useTheme } from '@/stores/theme';
import styles from './AppShell.module.css';

/**
 * Bottom of the sidebar (DESIGN §6): the profile menu with Log out (AUTH-4) and the theme
 * toggle. The trigger is named by its visible text (name and email). "Keyboard shortcuts" opens the
 * same help as `?`, so the shortcuts can be found without knowing one.
 */
export function ProfileMenu() {
  const t = useT();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const themeLabel = theme === 'dark' ? t.common.themeToLight : t.common.themeToDark;

  return (
    <div className={styles.profile}>
      <Menu
        label={t.shell.profile.menu}
        align="start"
        trigger={
          <button
            type="button"
            className={styles.profileButton}
            data-tip={user?.name ?? t.shell.profile.menu}
          >
            <Avatar name={user?.name ?? ''} size={32} decorative />
            <span className={styles.profileText}>
              <span className={styles.profileName}>{user?.name}</span>
              <span className={styles.profileEmail}>{user?.email}</span>
            </span>
            <Icon name="chevron-down" className={styles.profileChevron} />
          </button>
        }
      >
        <MenuLabel>{t.shell.profile.signedInAs(user?.email ?? '')}</MenuLabel>
        <MenuItem
          icon="lightbulb"
          onSelect={() => {
            useShortcuts.getState().setHelpOpen(true);
          }}
        >
          {t.shell.profile.shortcuts}
          <kbd className={styles.menuKbd} aria-hidden="true">
            ?
          </kbd>
        </MenuItem>
        <MenuItem icon="log-out" onSelect={logout}>
          {t.shell.profile.logOut}
        </MenuItem>
      </Menu>
      <IconButton
        icon="theme"
        aria-label={themeLabel}
        data-tip={themeLabel}
        className={styles.themeToggle}
        onClick={toggleTheme}
      />
    </div>
  );
}
