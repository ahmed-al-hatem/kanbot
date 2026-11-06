import { lazy, Suspense } from 'react';
import { useRouteError } from 'react-router';
import { Logo } from '@/components/Logo/Logo';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { titleOf, useDocumentTitle } from '@/lib/documentTitle';
import { isChunkLoadError, reloadPage } from './chunkError';
import styles from './ErrorPage.module.css';

/*
 * Any other error loads the page error on demand. If that chunk can't load either, the lazy
 * component throws and the next boundary up (in the end `AppErrorBoundary`) takes over.
 */
const RenderErrorPage = lazy(async () => {
  const { RenderErrorPage: Component } = await import('./RenderErrorPage');
  return { default: Component };
});

/**
 * React Router error boundary for the pages inside the app shell (plan §9.3): the sidebar
 * stays, and only `<main>` shows the error. A lazy chunk that can't load after a deploy asks
 * for a reload — that screen is in the startup bundle with no component imports, since it must
 * not need a chunk itself. Anything else is the page error with Try again.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isChunkLoadError(error)) return <UpdateAvailable />;
  return (
    <Suspense fallback={null}>
      <RenderErrorPage error={error} />
    </Suspense>
  );
}

/** The same boundary at the root (guest pages, the shell itself): full page, with the logo. */
export function RootErrorBoundary() {
  return (
    <main id="main" tabIndex={-1} className={styles.standalone}>
      <div className={styles.standaloneLogo}>
        <Logo size={36} wordmark />
      </div>
      <RouteErrorBoundary />
    </main>
  );
}

/** The English dictionary is in the startup bundle, so this needs no chunk in either language. */
function UpdateAvailable() {
  const copy = useT().errorPages;
  useDocumentTitle(titleOf(copy.updateDocumentTitle));
  return (
    <div role="alert" className={cx(styles.page, 'kb-page')}>
      <span className={styles.tag}>{copy.updateTag}</span>
      <h1 className={styles.title} tabIndex={-1}>
        {copy.updateTitle}
      </h1>
      <p className={styles.body}>{copy.updatePageText}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.plainButton} onClick={reloadPage}>
          {copy.reload}
        </button>
      </div>
    </div>
  );
}
