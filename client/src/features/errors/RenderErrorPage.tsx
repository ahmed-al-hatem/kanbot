import { useLocation, useNavigate } from 'react-router';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { useT } from '@/i18n';
import { titleOf, useDocumentTitle } from '@/lib/documentTitle';

/**
 * A page that crashed while rendering (not a missing chunk): the page error with Try again.
 * Loaded on demand by `RouteErrorBoundary`, so PageError stays out of the startup bundle.
 */
export function RenderErrorPage({ error }: { error: unknown }) {
  const t = useT();
  const copy = t.errorPages;
  const location = useLocation();
  const navigate = useNavigate();
  useDocumentTitle(titleOf(copy.crashTitle));
  return (
    <div className="kb-page">
      <PageHeader title={copy.crashTitle} />
      <div className="page-body">
        <PageError
          page={copy.thisPage}
          error={error}
          // A navigation to the same place clears the route error and renders the page again.
          onRetry={() => {
            void navigate(location, { replace: true });
          }}
        />
      </div>
    </div>
  );
}
