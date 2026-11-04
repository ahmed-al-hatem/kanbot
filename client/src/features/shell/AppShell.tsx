import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import { NavigationType, Outlet, ScrollRestoration, useLocation, useMatch, useNavigationType } from 'react-router';
import { useAssistant } from '@/stores/assistant';
import { MobileTopBar } from './MobileTopBar';
import { OfflineBanner } from './OfflineBanner';
import { Sidebar } from './Sidebar';
import { SkipLink } from './SkipLink';
import styles from './AppShell.module.css';

// The drawer's chunk loads on the first "Ask AI" (plan §5.4), then stays mounted so an answer
// that arrives while it is closed still lands in its chat.
const AssistantDrawer = lazy(async () => {
  const { AssistantDrawer: Component } = await import('@/features/ai/AssistantDrawer');
  return { default: Component };
});

/**
 * Screen readers don't notice a client-side page change, so after a navigation focus moves to
 * the new page's h1 (or `<main>`), as plan §9.3 asks. Not on first load (the skip link stays
 * the first Tab stop), not for redirects, and not when only the query string changes.
 */
function useFocusOnRouteChange(mainRef: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (navigationType === NavigationType.Replace) return;
    const main = mainRef.current;
    const target = main?.querySelector<HTMLElement>('h1') ?? main;
    target?.focus({ preventScroll: true });
  }, [pathname, navigationType, mainRef]);
}

/**
 * The signed-in layout (DESIGN §6): skip link, offline banner, mobile bar, sidebar nav and
 * `<main id="main">` with the page. The current project comes from the URL (PRJ-5).
 */
export function AppShell() {
  const { pathname } = useLocation();
  const projectId = useMatch('/projects/:projectId/*')?.params.projectId;
  const mainRef = useRef<HTMLElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerOpen = useAssistant((s) => s.open);
  const [drawerLoaded, setDrawerLoaded] = useState(drawerOpen);
  const [navOpen, setNavOpen] = useState(false);
  const [navPath, setNavPath] = useState(pathname);

  // Adjusting state during render (not in an effect): the mobile panel closes on navigation.
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }
  // Mounted on first open and kept, so the drawer can play its exit animation.
  if (drawerOpen && !drawerLoaded) setDrawerLoaded(true);

  useFocusOnRouteChange(mainRef);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setNavOpen(false);
      hamburgerRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  return (
    <div className={styles.shell}>
      <SkipLink />
      <OfflineBanner />
      <MobileTopBar
        navOpen={navOpen}
        onToggleNav={() => {
          setNavOpen((open) => !open);
        }}
        inProject={Boolean(projectId)}
        hamburgerRef={hamburgerRef}
      />
      <div className={styles.body}>
        <Sidebar projectId={projectId} open={navOpen} />
        {/* While the mobile panel covers the page, the page is out of reach (inert). */}
        <main id="main" ref={mainRef} tabIndex={-1} className={styles.main} inert={navOpen}>
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
      {drawerLoaded && (
        <Suspense fallback={null}>
          <AssistantDrawer />
        </Suspense>
      )}
    </div>
  );
}
