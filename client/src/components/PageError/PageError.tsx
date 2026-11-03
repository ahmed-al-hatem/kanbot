import { isApiError } from '@/api/errors';
import { Button, ButtonLink } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { cx } from '@/lib/cx';
import styles from './PageError.module.css';

interface PageErrorProps {
  /** Lower-case page name: "We couldn't load <page>". */
  page: string;
  /** The query error; shown as a small code under the actions. */
  error?: unknown;
  onRetry: () => void;
  /** True while the refetch runs: the button spins and says "Retrying…". */
  retrying?: boolean;
  /** Where "Back to Projects" goes; `false` hides it (e.g. on the Projects page itself). */
  backTo?: string | false;
  className?: string;
}

const STATUS_TEXT: Record<number, string> = {
  500: 'Internal server error',
  502: 'Bad gateway',
  503: 'Service unavailable',
  504: 'Gateway timeout',
};

function errorCode(error: unknown): string | null {
  if (!isApiError(error)) return null;
  if (error.code === 'NETWORK_ERROR') return 'Network error · server unreachable';
  if (error.code === 'TIMEOUT') return 'Timeout · no response in time';
  return `Error ${error.status} · ${STATUS_TEXT[error.status] ?? error.code}`;
}

/**
 * DESIGN §11 "Page load error" (artboard S04): status-error icon, "We couldn't load …",
 * reassurance, Try again (primary), Back to Projects and a small error code. `role="alert"`.
 */
export function PageError({ page, error, onRetry, retrying = false, backTo = '/projects', className }: PageErrorProps) {
  const code = errorCode(error);
  return (
    <div role="alert" className={cx(styles.error, 'kb-rise', className)}>
      <span className={styles.badge}>
        <Icon name="status-error" size={20} />
      </span>
      <h2 className={styles.title}>We couldn&apos;t load {page}</h2>
      <p className={styles.text}>
        The server didn&apos;t respond or your connection dropped. Nothing you saved was lost — try again in a
        moment.
      </p>
      <div className={styles.actions}>
        <Button variant="primary" icon="refresh" loading={retrying} loadingText="Retrying…" onClick={onRetry}>
          Try again
        </Button>
        {backTo !== false && (
          <ButtonLink to={backTo} variant="subtle">
            Back to Projects
          </ButtonLink>
        )}
      </div>
      {code && <p className={styles.code}>{code}</p>}
    </div>
  );
}
