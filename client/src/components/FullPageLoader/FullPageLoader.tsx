import { Logo } from '@/components/Logo/Logo';
import { Spinner } from '@/components/Spinner/Spinner';
import styles from './FullPageLoader.module.css';

interface FullPageLoaderProps {
  /** Announced text, e.g. "Loading your workspace". */
  label?: string;
}

/**
 * Covers the page while the app can't render yet: `GET /auth/me` on startup (AUTH-3) and the
 * first route chunk. It fades in after 150ms, so a fast check never flashes (DESIGN §11).
 */
export function FullPageLoader({ label = 'Loading your workspace' }: FullPageLoaderProps) {
  return (
    <div className={styles.loader}>
      <div className={styles.inner}>
        <Logo size={36} />
        <Spinner size={24} label={label} className={styles.spinner} />
      </div>
    </div>
  );
}
