import { useLocation, useNavigate } from 'react-router';
import { PageError } from '@/components/PageError/PageError';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { titleOf, useDocumentTitle } from '@/lib/documentTitle';

/**
 * A page that crashed while rendering (not a missing chunk): the page error with Try again.
 * Loaded on demand by `RouteErrorBoundary`, so PageError stays out of the startup bundle.
 */
export function RenderErrorPage({ error }: { error: unknown }) {
  const location = useLocation();
  const navigate = useNavigate();
  useDocumentTitle(titleOf('Something went wrong'));
  return (
    <div className="kb-page">
      <PageHeader title="Something went wrong" />
      <div className="page-body">
        <PageError
          page="this page"
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
