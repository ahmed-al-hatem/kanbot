import { useEffect, useRef } from 'react';
import { useLocation, useMatch, useNavigate } from 'react-router';
import { getT } from '@/i18n';
import { announce } from '@/stores/announcer';
import { useNotFound } from '@/stores/notFound';
import { useShortcuts } from '@/stores/shortcuts';
import {
  activate,
  CREATE_TARGET,
  GO_KEYS,
  isTypingTarget,
  overlayOpen,
  SEARCH_TARGET,
  SEQUENCE_MS,
  whenPresent,
} from './shortcuts';

/** `location.state` that tells the shell not to move focus to the h1 (a shortcut focuses something else). */
export interface ShortcutNavState {
  keepFocus: true;
}

/**
 * Requirements §9 keyboard shortcuts, mounted once by the app shell: `c` create, `/` search,
 * `g b` / `g k` / `g s` go to Board / Backlog / Sprints, `?` help. Ignored while typing in a
 * field, with Ctrl/⌘/Alt held, and while a dialog, the drawer or a menu is open.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const routeProjectId = useMatch('/projects/:projectId/*')?.params.projectId;
  const missingProject = useNotFound((s) => s.cause === 'project');
  const projectId = missingProject ? undefined : routeProjectId;
  // Read from the listener without re-adding it on every navigation.
  const current = useRef({ projectId, pathname });
  useEffect(() => {
    current.current = { projectId, pathname };
  }, [projectId, pathname]);

  useEffect(() => {
    let waitingForGo = false;
    let goTimer: ReturnType<typeof setTimeout> | undefined;

    const go = (section: 'board' | 'backlog' | 'sprints') => {
      const id = current.current.projectId;
      if (!id) {
        announce(getT().shell.shortcuts.needProject);
        return;
      }
      void navigate(`/projects/${id}/${section}`);
    };

    const create = () => {
      const target = document.querySelector<HTMLElement>(CREATE_TARGET);
      if (target) {
        activate(target);
        return;
      }
      const { projectId: id, pathname: path } = current.current;
      const backlog = id && `/projects/${id}/backlog`;
      if (!backlog || path === backlog) {
        announce(getT().shell.shortcuts.nothingToCreate);
        return;
      }
      // Elsewhere in a project: the Backlog's quick create, once the page has it.
      const state: ShortcutNavState = { keepFocus: true };
      void navigate(backlog, { state });
      whenPresent(CREATE_TARGET, activate);
    };

    const search = () => {
      const target = document.querySelector<HTMLElement>(SEARCH_TARGET);
      if (target) activate(target);
      else announce(getT().shell.shortcuts.noSearch);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey)
        return;
      if (isTypingTarget(event.target) || overlayOpen()) {
        waitingForGo = false;
        return;
      }

      if (waitingForGo) {
        waitingForGo = false;
        clearTimeout(goTimer);
        const section = GO_KEYS[event.key];
        if (section) {
          event.preventDefault();
          go(section);
        }
        return;
      }

      switch (event.key) {
        case 'g':
          waitingForGo = true;
          goTimer = setTimeout(() => {
            waitingForGo = false;
          }, SEQUENCE_MS);
          return;
        case 'c':
          event.preventDefault();
          create();
          return;
        case '/':
          // Also stops Firefox's quick find.
          event.preventDefault();
          search();
          return;
        case '?':
          event.preventDefault();
          useShortcuts.getState().setHelpOpen(true);
          return;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(goTimer);
    };
  }, [navigate]);
}
