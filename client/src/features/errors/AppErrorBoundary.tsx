import { Component, type ReactNode } from 'react';
import { Logo } from '@/components/Logo/Logo';
import { getT, type Messages } from '@/i18n';
import { en } from '@/i18n/messages/en';
import { cx } from '@/lib/cx';
import { titleOf } from '@/lib/documentTitle';
import { isChunkLoadError, reloadPage } from './chunkError';
import styles from './ErrorPage.module.css';

/**
 * The messages for the crash screen. It may render outside the providers, or because the
 * locale store or a dictionary broke: anything that throws (or a dictionary without this
 * section) falls back to the English one, which is in the startup bundle.
 */
function crashMessages(): Messages {
  try {
    const t = getT();
    // The types say both sections exist; a dictionary that failed half-way may not have them.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return t.errorPages && t.notFound ? t : en;
  } catch {
    return en;
  }
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
  error: unknown;
}

/**
 * The last line (Requirements §9 "Error boundary with a friendly crash screen"): anything that
 * escapes the router's boundaries — the providers, the toast host, the router itself. It sits
 * outside the router, so it uses a plain link; it imports no components (the startup bundle stays
 * small, and a crash screen must not need a chunk); and it doesn't log: the console has the error.
 * Its text comes from `getT()` (not a hook: it may sit above every provider), English if that fails.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { failed: true, error };
  }

  override componentDidCatch() {
    document.title = titleOf(crashMessages().errorPages.crashTitle);
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    const update = isChunkLoadError(this.state.error);
    const t = crashMessages();
    const copy = t.errorPages;
    return (
      <main id="main" tabIndex={-1} className={styles.standalone}>
        <div className={styles.standaloneLogo}>
          <Logo size={36} wordmark />
        </div>
        <div role="alert" className={cx(styles.page, 'kb-page')}>
          <h1 className={styles.title}>{update ? copy.updateTitle : copy.crashTitle}</h1>
          <p className={styles.body}>{update ? copy.updateText : copy.crashText}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.plainButton} onClick={reloadPage}>
              {copy.reload}
            </button>
            {!update && (
              <a className={styles.plainLink} href="/projects">
                {t.notFound.goToProjects}
              </a>
            )}
          </div>
        </div>
      </main>
    );
  }
}
