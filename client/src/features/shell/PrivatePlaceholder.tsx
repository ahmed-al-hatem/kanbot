import { Button } from '@/components/Button/Button';
import { Logo } from '@/components/Logo/Logo';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { cx } from '@/lib/cx';
import styles from './PrivatePlaceholder.module.css';

/**
 * Phase 2 stand-in for every private page until the app shell and Projects land in phase 3.
 * It proves the guard let the user in and carries the Log out action (AUTH-4).
 */
export function PrivatePlaceholder() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <title>Projects · Kanbot</title>
      <header className={styles.header}>
        <Logo size={28} wordmark />
        <Button variant="subtle" icon="log-out" onClick={logout}>
          Log out
        </Button>
      </header>
      <div className={cx(styles.body, 'kb-page')}>
        <h1 className="page-title">Projects</h1>
        {user && (
          <p className={styles.text}>
            Signed in as <b>{user.name}</b> ({user.email}). Projects, backlog and the board arrive in the next phases.
          </p>
        )}
      </div>
    </main>
  );
}
