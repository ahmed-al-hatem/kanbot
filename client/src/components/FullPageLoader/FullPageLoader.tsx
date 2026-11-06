import { Logo } from '@/components/Logo/Logo';
import { Spinner } from '@/components/Spinner/Spinner';
import { useT } from '@/i18n';
import styles from './FullPageLoader.module.css';

interface FullPageLoaderProps {
  /** Announced text; "Loading your workspace" by default. */
  label?: string;
}

/**
 * Covers the page while the app can't render yet: `GET /auth/me` on startup (AUTH-3) and the
 * first route chunk. It fades in after 150ms, so a fast check never flashes (DESIGN §11).
 */
export function FullPageLoader({ label }: FullPageLoaderProps) {
  const t = useT();
  return (
    <div className={styles.loader}>
      <div className={styles.inner}>
        <Logo size={36} />
        <Spinner size={24} label={label ?? t.common.loadingWorkspace} className={styles.spinner} />
      </div>
    </div>
  );
}
