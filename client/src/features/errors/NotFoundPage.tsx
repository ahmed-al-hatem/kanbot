import { useLocation, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/Button/Button';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import { Logo } from '@/components/Logo/Logo';
import { useProjects } from '@/hooks/useProjects';
import { getT, useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { useDocumentTitle } from '@/lib/documentTitle';
import { useAssistant } from '@/stores/assistant';
import { useMarkNotFound, type NotFoundCause } from '@/stores/notFound';
import { notFoundCopy, notFoundTitle } from './notFoundCopy';
import styles from './ErrorPage.module.css';

interface NotFoundPageProps {
  cause?: NotFoundCause;
}

/**
 * Signed in, inside the app shell (sidebar visible, no nav item current). An SPA can't answer
 * with HTTP 404 (the server sends index.html for every path), so the status lives in the page
 * and its title — see the README.
 */
export function NotFoundPage({ cause = 'route' }: NotFoundPageProps) {
  const { projectId } = useParams();
  const projects = useProjects();
  useMarkNotFound(cause);

  // A todo or sprint is missing from a project that exists: that project is the current one.
  const currentProjectId = cause === 'todo' || cause === 'sprint' ? projectId : undefined;
  // Without one, the AI looks in the most recently updated project (the chat is per project).
  const aiProjectId = currentProjectId ?? projects.data?.[0]?.id;

  return (
    <NotFoundContent
      cause={cause}
      activeSprintTo={currentProjectId && `/projects/${currentProjectId}/board`}
      onAskAi={
        aiProjectId
          ? (path) => {
              // Nothing is sent until the user does: it only fills the composer.
              useAssistant.getState().openWith(aiProjectId, getT().notFound.findItPrompt(path));
            }
          : undefined
      }
    />
  );
}

/** Signed out: the same content centered on `--surface-sunken` with the logo, like the auth pages. */
export function SignedOutNotFoundPage() {
  return (
    <main id="main" tabIndex={-1} className={styles.standalone}>
      <div className={styles.standaloneLogo}>
        <Logo size={36} wordmark />
      </div>
      <NotFoundContent cause="route" />
    </main>
  );
}

interface NotFoundContentProps {
  cause: NotFoundCause;
  /** "Open Active Sprint": hidden without a current project. */
  activeSprintTo?: string | false;
  /** "Ask AI to find it": hidden when there is no project to ask about (or signed out). */
  onAskAi?: (path: string) => void;
}

function NotFoundContent({ cause, activeSprintTo, onAskAi }: NotFoundContentProps) {
  const t = useT();
  const location = useLocation();
  const path = `${location.pathname}${location.search}${location.hash}`;
  const copy = notFoundCopy(t, cause);
  useDocumentTitle(notFoundTitle(t));

  return (
    <div className={cx(styles.page, 'kb-page')}>
      <NotFoundIllustration />
      <Lozenge>{t.notFound.code}</Lozenge>
      {/* tabIndex -1: the shell moves focus here after a navigation. */}
      <h1 className={styles.title} tabIndex={-1}>
        {copy.title}
      </h1>
      <p className={styles.body}>{copy.body}</p>
      <code className={styles.path} title={path}>
        <span className="visually-hidden">{t.notFound.requested}</span>
        {window.location.host}
        {path}
      </code>
      <div className={styles.actions}>
        <ButtonLink to="/projects" variant="primary">
          {t.notFound.goToProjects}
        </ButtonLink>
        {activeSprintTo && (
          <ButtonLink to={activeSprintTo}>{t.notFound.openActiveSprint}</ButtonLink>
        )}
        {onAskAi && (
          <Button
            variant="ai"
            icon="ai-sparkle"
            aria-haspopup="dialog"
            onClick={() => {
              onAskAi(path);
            }}
          >
            {t.notFound.askAi}
          </Button>
        )}
      </div>
    </div>
  );
}

/** The drawing's geometry (numbers, not text): three columns of cards, one missing. */
const ART = {
  width: 240,
  height: 140,
  viewBox: '0 0 240 140',
  columns: [8, 86, 164],
  headers: [16, 94, 172],
  dash: '4 4',
} as const;

/**
 * 240×140, token-coloured so it works in both themes: three columns, the middle card missing
 * and replaced by a dashed outline with a "?". Decorative.
 */
function NotFoundIllustration() {
  const sunken = { fill: 'var(--surface-sunken)' };
  const header = { fill: 'var(--neutral-hover)' };
  const card = { fill: 'var(--surface-raised)', stroke: 'var(--border)' };
  // CSS variables only work in `style`, not in SVG presentation attributes.
  return (
    <svg
      className={styles.illustration}
      width={ART.width}
      height={ART.height}
      viewBox={ART.viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {ART.columns.map((x) => (
        <rect key={x} x={x} y={10} width={68} height={120} rx={8} style={sunken} />
      ))}
      {ART.headers.map((x) => (
        <rect key={x} x={x} y={22} width={52} height={10} rx={3} style={header} />
      ))}
      <rect x={16} y={42} width={52} height={34} rx={6} style={card} />
      <rect x={172} y={42} width={52} height={34} rx={6} style={card} />
      <rect
        x={94.5}
        y={42.5}
        width={51}
        height={51}
        rx={6}
        strokeDasharray={ART.dash}
        style={{ fill: 'var(--drop)', stroke: 'var(--border-selected)' }}
      />
      <text
        x={120}
        y={76}
        textAnchor="middle"
        fontSize={24}
        fontWeight={700}
        style={{ fill: 'var(--text-selected)', fontFamily: 'var(--font-sans)' }}
      >
        ?
      </text>
      <rect x={16} y={84} width={52} height={34} rx={6} style={card} />
    </svg>
  );
}
