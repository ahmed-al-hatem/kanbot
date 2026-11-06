import { isApiError } from '@/api/errors';
import { Button, ButtonLink } from '@/components/Button/Button';
import { Icon } from '@/components/Icon/Icon';
import { useT, type Messages } from '@/i18n';
import { cx } from '@/lib/cx';
import styles from './PageError.module.css';

interface PageErrorProps {
  /** Lower-case page name in the UI language: "We couldn't load <page>" (`pageError.title`). */
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

function statusText(status: number, t: Messages): string | undefined {
  if (status === 500) return t.pageError.status500;
  if (status === 502) return t.pageError.status502;
  if (status === 503) return t.pageError.status503;
  if (status === 504) return t.pageError.status504;
  return undefined;
}

function errorCode(error: unknown, t: Messages): string | null {
  if (!isApiError(error)) return null;
  if (error.code === 'NETWORK_ERROR') return t.pageError.network;
  if (error.code === 'TIMEOUT') return t.pageError.timeout;
  // An unlisted status shows the API's code (CONFLICT…): an identifier, the same in every language.
  return t.pageError.status(error.status, statusText(error.status, t) ?? error.code);
}

/**
 * DESIGN §11 "Page load error" (artboard S04): status-error icon, "We couldn't load …",
 * reassurance, Try again (primary), Back to Projects and a small error code. `role="alert"`.
 */
export function PageError({ page, error, onRetry, retrying = false, backTo = '/projects', className }: PageErrorProps) {
  const t = useT();
  const code = errorCode(error, t);
  return (
    <div role="alert" className={cx(styles.error, 'kb-rise', className)}>
      <span className={styles.badge}>
        <Icon name="status-error" size={20} />
      </span>
      <h2 className={styles.title}>{t.pageError.title(page)}</h2>
      <p className={styles.text}>{t.pageError.text}</p>
      <div className={styles.actions}>
        <Button variant="primary" icon="refresh" loading={retrying} loadingText={t.common.retrying} onClick={onRetry}>
          {t.common.tryAgain}
        </Button>
        {backTo !== false && (
          <ButtonLink to={backTo} variant="subtle">
            {t.common.backToProjects}
          </ButtonLink>
        )}
      </div>
      {code && <p className={styles.code}>{code}</p>}
    </div>
  );
}
