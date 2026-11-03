import { Avatar } from '@/components/Avatar/Avatar';
import { IconButton } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { Menu, MenuItem, MenuLabel } from '@/components/Menu/Menu';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useTheme } from '@/stores/theme';
import styles from './AppShell.module.css';

/**
 * Bottom of the sidebar (DESIGN §6): the profile menu with Log out (AUTH-4) and the theme
 * toggle. The trigger is named by its visible text (name and email).
 */
export function ProfileMenu() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);

  return (
    <div className={styles.profile}>
      <Menu
        label="Account"
        align="start"
        trigger={
          <button type="button" className={styles.profileButton}>
            <Avatar name={user?.name ?? ''} size={32} decorative />
            <span className={styles.profileText}>
              <span className={styles.profileName}>{user?.name}</span>
              <span className={styles.profileEmail}>{user?.email}</span>
            </span>
            <Icon name="chevron-down" className={styles.profileChevron} />
          </button>
        }
      >
        <MenuLabel>Signed in as {user?.email}</MenuLabel>
        <MenuItem icon="log-out" onSelect={logout}>
          Log out
        </MenuItem>
      </Menu>
      <IconButton
        icon="theme"
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className={styles.themeToggle}
        onClick={toggleTheme}
      />
    </div>
  );
}
