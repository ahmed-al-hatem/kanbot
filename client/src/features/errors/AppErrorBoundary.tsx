import { Component, type ReactNode } from 'react';
import { Logo } from '@/components/Logo/Logo';
import { isChunkLoadError, reloadPage } from './chunkError';
import styles from './ErrorPage.module.css';

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
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { failed: true, error };
  }

  override componentDidCatch() {
    document.title = 'Something went wrong · Kanbot';
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    const update = isChunkLoadError(this.state.error);
    return (
      <main id="main" tabIndex={-1} className={styles.standalone}>
        <div className={styles.standaloneLogo}>
          <Logo size={36} wordmark />
        </div>
        <div role="alert" className={`${styles.page} kb-page`}>
          <h1 className={styles.title}>{update ? 'A new version is available' : 'Something went wrong'}</h1>
          <p className={styles.body}>
            {update
              ? 'Kanbot was updated while this tab was open. Reload to get the latest version — everything you saved is safe.'
              : 'Kanbot hit an unexpected error. Reloading usually fixes it, and everything you saved is safe on the server.'}
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.plainButton} onClick={reloadPage}>
              Reload
            </button>
            {!update && (
              <a className={styles.plainLink} href="/projects">
                Go to Projects
              </a>
            )}
          </div>
        </div>
      </main>
    );
  }
}
