<p align="center"><img src="../design/logo/kanbot-logo.png" alt="Kanbot" width="300"></p>

# Kanbot — client

> React app for Kanbot, a sprint board with an AI teammate. Built phase by phase from
> [`docs/FRONTEND-PLAN.en.md`](../docs/FRONTEND-PLAN.en.md); the API in [`server/`](../server/) is the contract.

**Status:** Phase 3 — app shell and Projects. Auth works against the API; signed-in pages sit in the app shell (sidebar, project switcher, profile menu, mobile bar, offline banner) and Projects has full CRUD. Backlog, Active Sprint and Sprints are placeholder pages inside the shell until phases 4–6. In dev, `/__ui` shows every component and state in both themes.

---

## 1. Overview

_Screenshot and feature tour come with the screens (phase 8)._

## 2. Getting started

Requirements: Node 24 (`.nvmrc`; 22.22+ also works), the server running on port 4000.

```bash
# Terminal 1 — API (mock AI unless AI_API_KEY is set)
cd server
npm install
cp .env.example .env
npm run seed          # demo@kanbot.dev / password123
npm run dev           # http://localhost:4000/api/health

# Terminal 2 — client
cd client
npm install
cp .env.example .env  # optional: VITE_API_URL defaults to /api
npm run dev           # http://localhost:5173
```

`VITE_API_URL=/api` goes through the Vite proxy (`server.proxy` and `preview.proxy`) to `http://localhost:4000`, so every request is same-origin and the server's CORS rule (`CLIENT_ORIGIN=http://localhost:5173`) never gets in the way — on any port. `strictPort: true` makes Vite fail instead of silently moving to 5174.

## 3. Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server on 5173 (proxy `/api` → 4000) |
| `npm run build` | Type-check (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve `dist/` on 4173 (same proxy) |
| `npm run typecheck` | `tsc -b` for app and config projects |
| `npm run lint` | ESLint (zero warnings) + `scripts/check-css.mjs` (no hex outside `tokens.css`, logical properties only, `global(kbX)` keyframes in CSS Modules) |
| `npm run format` / `format:check` | Prettier write / check |
| `npm run test` | Vitest (watch); `npm run test -- --run` for a single run |
| `npm run e2e` | Playwright (added in phase 8) |
| `npm run icons` | Regenerate `src/components/Icon/icons.ts` from `@atlaskit/icon` |
| `npm run analyze` | Production build + `stats.html` bundle report (gzip sizes) |

## 4. Tech stack and why

| Area | Choice | Why |
|---|---|---|
| Build | Vite 8 + React 19 + TypeScript 6 (strict, `noUncheckedIndexedAccess`) | Fast dev server; strict types catch contract drift |
| Styling | CSS Modules + global `tokens.css` | The design is all CSS variables; zero runtime, 1:1 with DESIGN.md |
| Server state | TanStack Query v5 | Cache, retries, cancellation (`signal`), optimistic updates |
| UI state | Zustand (+ `persist`) | Small stores with selectors, callable outside React (e.g. on a 401) |
| HTTP | Native `fetch` in one `request<T>()` | 0 KB; TanStack Query already gives retry and cancellation |
| Primitives | Radix Dialog / AlertDialog / DropdownMenu | Focus trap/restore, Esc, roving focus — well tested, unstyled |
| Forms | react-hook-form + zod | Validate on blur, then on change (DESIGN §10.5) |
| DnD | dnd-kit | Keyboard sensor and screen-reader announcements |
| Icons | Own `<Icon>` + generated path map | `@atlaskit/icon` pulls in emotion and tokens; we ship only paths |
| Fonts | `@fontsource-variable/inter` (self-hosted) | No Google Fonts round-trip |
| Quality | ESLint 9 (typescript-eslint strict type-checked, react-hooks, react-refresh, jsx-a11y), Prettier, Vitest + Testing Library + MSW | NFR-1, NFR-8 |

## 5. Architecture

```
src/
├── main.tsx            # fonts + global styles, <Providers/>
├── router.tsx          # `routes` (guest + private layouts, lazy pages) and createBrowserRouter
├── routeChunks.ts      # the lazy page imports, shared by the router and hover/focus prefetch
├── app/                # Providers, queryClient, global hosts: Toaster (Flag), LiveRegion
├── api/                # client.ts (request<T>), errors.ts (ApiError), auth/projects/todos/sprints/ai.ts
├── hooks/              # queryKeys.ts (one key factory); useAuth.ts; useProjects.ts (list, one, CRUD, prefetch); useConnection.ts (online state, Retry now)
├── stores/             # Zustand UI state: session, theme, toast, announcer, assistant (drawer open), highlight (new project)
├── components/         # design system, one folder per component (see §6)
├── dev/                # UiPage: the /__ui catalogue, dev server only
├── features/           # auth/; shell/ (AppShell, Sidebar, ProjectSwitcher, ProfileMenu, MobileTopBar, OfflineBanner, SkipLink, ProjectLayout);
│                       # projects/ (ProjectsPage, ProjectTile, ProjectFormDialog); ai/ (AssistantDrawer shell);
│                       # backlog/, board/, sprints/ (placeholder pages until phases 4–6); todos/TypeIcon
├── lib/                # storage.ts, cx.ts, formErrors.ts, projectKey.ts (mirror of the server's key generation), useDelayedLoading.ts
├── styles/             # tokens.css, base.css, motion.css
├── test/               # setup.ts, MSW server, renderApp (real routes on a memory router)
└── types/api.ts        # verbatim copy of server/src/types/api.ts — never edited by hand
```

**State rules (plan §5.2).** Server data lives only in TanStack Query. Zustand holds UI state only: `session` (token + `sessionExpired`; only the token is persisted), `theme` (persisted as `kanbot.theme`), `toast` (one at a time, callable as `toast.error(…)` from a mutation), `announcer` (live-region messages). `signOut()` resets the UI stores and calls `queryClient.clear()`.

**API layer.** `request<T>(method, path, { body, query, signal, timeoutMs })` is the only `fetch` in the app (enforced by ESLint):

- adds `Authorization: Bearer <token>` and `Content-Type`; builds the query string, skipping empty values;
- `204` → `undefined`; non-2xx → `ApiError { status, code, message, details }` from `ApiErrorBody`;
- no response → `NETWORK_ERROR` ("Cannot reach the server. Is it running?"); over the timeout (15 s, 45 s for AI) → `TIMEOUT`; a cancel from TanStack Query is rethrown untouched so it stays a cancel;
- `401` on an authenticated request (except `/auth/login`) → `useSession.getState().expire()` (AUTH-6);
- `fieldErrors(err)` maps validation `details` to `{ field: message }` for `setError`.

**Auth flow (phase 2).**

| Situation | What happens |
|---|---|
| Signed-out visitor opens a private page | `ProtectedRoute` → `/login?redirect=<path + search>` (AUTH-5) |
| Signed-in user opens `/login`, `/register`, `/forgot-password` | `GuestRoute` → `?redirect=` if present, else `/projects` (AUTH-5) |
| Log in succeeds | `startSession()` clears the cache, seeds `['me']`, saves the token; `GuestRoute` then sends the user to `?redirect=` (AUTH-2) |
| Reload with a saved token | `GET /auth/me` behind a full-page loader; a non-401 failure shows PageError with Try again (AUTH-3) |
| Saved token rejected on startup | 401 → `expire()` → straight to `/login?redirect=…` with "Your session has expired. Please log in again." (no dialog: the user never got in) |
| 401 mid-session | `expire()` → the page stays behind `SessionExpiredDialog` (Esc and scrim do nothing) → "Log in again" → `/login?redirect=<current page>` with the same message (AUTH-6) |
| Log out (profile menu at the bottom of the sidebar) | `signOut()` clears token, UI stores and cache, and sets `signedOut` so the guard goes to plain `/login` (AUTH-4) |
| Log in / log out in another tab | `listenForSessionChanges()` rehydrates the token on the `storage` event and clears the cache (plan §9.2) |

`?redirect=` is accepted only as a same-origin app path (`safeRedirect`): `//host`, `/\host`, absolute URLs and guest pages fall back to `/projects`, so the login page can't be used as an open redirect.

Forms use react-hook-form + zod with `mode: 'onTouched'` (validate on blur, then on every change). The client schemas mirror the server's (`name` 1–80, `password` 8–200, trimmed email). On submit with errors, focus goes to the first invalid field and the live region says "N fields need attention". Server `details[]` go under their fields via `applyServerErrors()`; a register 409 always lands under Email; anything else (401, 429, network) is a danger banner above the form. Submit buttons use `loading`, which swallows clicks and the implicit Enter submit, so a form can't be sent twice.

The endpoint modules unwrap the response envelopes (`{ project }` → `ProjectWithStats`) and pass `signal` through. The QueryClient uses `staleTime: 30s`, refetch on focus, and never retries a 4xx.

## 6. Design implementation

- Source: [design canvas](https://claude.ai/code/artifact/efe99d87-baac-4bb7-96e1-235363299397) (`project/Main.dc.html`) and [`design/DESIGN.md`](../design/DESIGN.md) for values.
- `styles/tokens.css`: DESIGN §3.2 colors verbatim (`.light` / `.dark` on `<html>`), plus spacing, radius, fixed sizes, dialog widths, font stacks and easing. **The only file with hex colors** — enforced by ESLint (TS/TSX literals) and `scripts/check-css.mjs` (CSS files, part of `npm run lint`), which also rejects physical CSS properties.
- Theme: an inline script in `index.html` sets the class before first paint (saved choice, else `prefers-color-scheme`); `stores/theme.ts` starts from that class and cross-fades with the `theming` class for 300 ms.
- `styles/motion.css`: DESIGN §8.3 keyframes verbatim, utility classes from the prototype (`kb-page`, `kb-rise`, `kb-pop`, `kb-shake`, `kb-added`, `kb-stagger` with `--i` / `--col`), RTL variants for drawer and flag, and the reduced-motion override.
- Icons: `scripts/extract-icons.mjs` copies the paths of the 34 icons in DESIGN §5.2, plus `priority-highest` for `urgent`, from `@atlaskit/icon@38.0.2` / `icon-lab@7.11.0` into `icons.ts`. `<Icon>` is `aria-hidden` unless given a `label`. `TypeIcon` (Task/Story from §5.3, Bug from the package) is always labelled when alone.
- `Logo`: the inline mark from §5.4, colored with `--logo-*` tokens (same in both themes).

### Components (phase 1)

CSS Modules + tokens only; every one is in `/__ui` (run `npm run dev`, open http://localhost:5173/__ui).

| Component | Notes |
|---|---|
| `Button`, `ButtonLink`, `IconButton` | Variants primary / neutral / subtle / ai / danger, sizes sm 28 · md 32 · lg 40. `loading` + `loadingText` ("Saving…"): idle and loading labels share one grid cell, so the width never jumps; the button stays focusable (`aria-disabled` + `aria-busy`) and swallows clicks, including the implicit Enter submit. `IconButton` requires `aria-label` in its type. `ButtonLink` = router `Link` styled as a button |
| `Field` + `Input`, `Textarea`, `Select`, `DateInput`, `TagInput` | `Field` gives the control its id (label `htmlFor`), `aria-describedby` (error, else help), `aria-invalid` and `aria-required` through context; explicit props win. Error = 12px status-error icon + `kb-shake` + `role="alert"`. Select/Date draw the chevron/calendar icon at inline-end 10px; the date picker indicator is invisible but still clickable under it |
| `Checkbox` | Native 16px, `accent-color: var(--brand)`, optional description linked by `aria-describedby` |
| `TagInput` | Enter or `,` adds, Backspace on empty removes the last, × per chip ("Remove label x"), case-insensitive dedupe, `maxTags` 10 / `maxTagLength` 30 (server limits), changes announced through `stores/announcer`, a typed tag is kept on blur |
| `Dialog` | Radix Dialog, fully controlled (a parent can veto closing for unsaved changes). Widths from §3.5 by name (`session` … `plan`). Focus goes to `[data-autofocus]` or the panel; trap, Esc and `aria-hidden` on the rest of the page come from Radix; `aria-modal` and focus restore to the opener are ours (`useReturnFocus`). Blanket and panel play `kbFade`/`kbModalIn` and exit with `kbFadeOut`/`kbModalOut` on `data-state="closed"` (Radix keeps them mounted until the animation ends) |
| `ConfirmDialog` | Radix AlertDialog, 420px: Cancel focused on open, no blanket dismiss, `pending` keeps it open with a "Deleting…" spinner |
| `Menu`, `MenuItem`, `MenuSeparator`, `MenuLabel` | Radix DropdownMenu: `role="menu"`, ↑ ↓ Home End + typeahead, wraps, Esc/outside click refocuses the trigger. The first item is focused on open with mouse too (§10.3). `kbPop` on open |
| `Lozenge`, `Chip`, `PointsPill`, `Avatar` | Lozenge hues + pulsing `live` dot (Active). Chip tones (neutral, danger, label hues) with optional × button. PointsPill reads "3 story points" / "Not estimated". Avatar initials, `--av-1…4` by index or name hash, spring hover, dashed "unassigned" |
| `ProgressBar`, `StatTile` | `role="progressbar"` with label and `aria-valuetext`; 4/6/8px; width eases 500ms; `over` turns it `--danger-icon`. StatTile md (28/32) and sm (22/28), hover lift, mount stagger by `index` |
| `Skeleton`, `SkeletonRegion`, `Spinner` | Shimmering blocks (always `aria-hidden`) inside a `role="status" aria-busy` region with "Loading <page>". Spinner 14/20/24, decorative unless given a `label` |
| `EmptyState`, `PageError`, `Banner`, `VisuallyHidden` | EmptyState `sunken` (nothing yet) or `dashed` (no match). PageError = S04: "We couldn't load <page>", Try again (spins while retrying), Back to Projects, and a small code from the `ApiError`. Banner warning (`role="status"`) / danger (`role="alert"`), page or inline layout, action inherits the banner color |

### Hosts and auth screens (phase 2)

| Piece | Notes |
|---|---|
| `Toaster` (Flag) | Fixed bottom inline-start, 24px; `--flag` / `--flag-fg`; success/error/info icon; optional action (bold, underlined) and Dismiss. The `role="status"` region is always mounted so a new toast is announced. 3.2s, 5s with an action (DESIGN §7); the timer pauses on hover or focus. `kbFlagIn` / `kbFlagOut`, RTL variants via `:dir(rtl)` |
| `LiveRegion` | One polite and one assertive visually hidden region at the root, fed by `announce()`. The message node is keyed by id, so the same text is announced twice |
| `FullPageLoader` | Logo + 24px spinner labelled "Loading your workspace" on `--surface-sunken`; fades in after 150ms so a fast `/auth/me` never flashes. Also the router's `hydrateFallbackElement` |
| `AuthLayout` | 420px card (radius 12, overlay shadow, 40 40 32 padding; 32 24 24 under 480px), logo 36 + 22px wordmark, tagline, theme toggle at the top inline-end, `<main id="main">`, a `<title>` per page |
| Login | "Welcome back", Email (`email`), Password (`current-password`) with "Forgot password?" on its label row but after it in tab order, "Logging in…". 401 → danger banner with the server message, password `aria-invalid` and described by the banner; cleared on any edit |
| Register | Name (`name`), Email, Password (`new-password`) with the strength meter and help text, Confirm (re-checked when the password changes after it was visited), "Creating account…", welcome toast "Welcome to Kanbot, &lt;first name&gt;" |
| Forgot password | Email → "Sending…" (simulated 800ms) → "Check your email" with the address in bold, Resend with a 30s cooldown ("Resend link in 12s"), "Back to log in", and the "Demo only" note |
| `SessionExpiredDialog` | Radix AlertDialog, 420px, lock badge, "Your session has expired", one primary lg action focused on open; Esc and the scrim do nothing |

### Shell and Projects (phase 3)

**Routes.** `ProtectedRoute` → `AppShell` (lazy layout) → `/projects` and `/projects/:projectId` (`ProjectLayout`) → `backlog`, `board`, `sprints/:sprintId?`. `/` and `/projects/:projectId` redirect to `/projects` and to the backlog. The current project is always the `:projectId` in the URL (PRJ-5), so a reload reopens it.

| Piece | Notes |
|---|---|
| `AppShell` | Skip link (first Tab stop, slides in on focus) → offline banner → mobile bar → `<nav aria-label="Main">` + `<main id="main" tabindex="-1">`. After a navigation, focus moves to the page's h1 (or `<main>`); not on first load, redirects or query-string changes. `ScrollRestoration`. The AI drawer chunk loads on the first Ask AI |
| `Sidebar` | 240px, canvas order: logo, project switcher, "Project" section (Backlog / Active Sprint / Sprints — only with a project in the URL), divider, Projects, then the profile menu and theme toggle. `NavLink` gives `aria-current="page"`; the active item has the 3px brand bar scaling in (`kbBar`). Hover/focus prefetches the project and the page chunk |
| `ProjectSwitcher` | 44px button: project avatar, name, key, chevron ("Choose a project" on `/projects`). Menu: "Your projects", one item per project (the current one ticked), "View all projects". Switching keeps the page (board → board) |
| `ProfileMenu` | Avatar, name and email open a menu with **Log out** (AUTH-4); the theme toggle sits next to it |
| `PageHeader` | 64px: h1 (`tabindex=-1`, the focus target), meta, actions slot. `ProjectMeta` shows the project name and key lozenge. `AskAiButton` opens the drawer |
| Mobile / tablet | ≤ 760px: sidebar hidden, 56px top bar (hamburger with `aria-expanded`/`aria-controls`, logo, Ask AI inside a project); the hamburger opens the nav as a full-height panel (`kbPop`), the page behind is `inert`, Esc closes it and refocuses the hamburger, any navigation closes it. 761–1023px: the sidebar collapses to a 64px icon rail (labels stay for screen readers) |
| `OfflineBanner` | From TanStack `onlineManager`: warning banner "You're offline. Changes will sync when you reconnect." with **Retry now** ("Reconnecting…", pings `/health`). Queries and mutations pause offline and resume by themselves; toast "Back online · your changes are synced" |
| `AssistantDrawer` | Shell only: 440px side dialog (100% on mobile) "Kanbot Assistant · AI can make mistakes", blanket, focus trap, Esc, focus restore, slide in/out. The chat comes in phase 7 |
| `ProjectsPage` | Header "Projects · N projects" + New project. Search by name or key (kept in `?q=`), grid `auto-fill minmax(280px, 1fr)` of tiles plus the dashed new-project tile; skeleton (after 150ms, at least 300ms), PageError with Try again, empty state "No projects yet" → **Create your first project**, "No projects match “q”" → Clear search |
| `ProjectTile` | Avatar, name (stretched link to the backlog), key lozenge, description (2 lines), backlog count, "Sprint N active" (live dot) or "No active sprint", ⋯ menu Open / Edit / Delete above the link. Hover lift, mount stagger, `kbAdded` on a just-created project. Hover/focus prefetches |
| `ProjectFormDialog` | Create and edit (560px). Live preview: avatar, name, "Todos will be numbered KEY-1" with the key the **server** will generate (`lib/projectKey.ts` mirrors `keyFromName` and the KANA/KANB collision loop against the cached keys). Name required ≤ 80; key optional, 2–6 letters, uppercased as typed (required when editing, with "Changing the key doesn't change existing todo keys."); description ≤ 500. A 409 puts "This key is already used" under Key and focuses it. Create → toast + the new project's backlog (PRJ-2); edit → toast |
| Delete | `ConfirmDialog` "Delete <name>?" naming the project and its key and warning that all its sprints and its N todos go too (PRJ-4, plan §10 decision 2). Optimistic: the tile goes at once and comes back with an error toast if the request fails; success toasts "<name> deleted" and stays on `/projects` |
| `ProjectLayout` | Loads the project from the URL; a failed load, or an id the API returns 404 for, shows PageError ("We couldn't load this project", Back to Projects) until the 404 page in phase 8 |

**Data.** `useProjects()`, `useProject(id)`, `useCurrentProject()`, `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()` and `usePrefetchProject()` in `hooks/useProjects.ts`, with keys from `qk` (plan §5.1): project CRUD writes the result into `project(id)` and `projects`, then invalidates both; delete also drops the project's `todos` and `sprints` caches. A project detail starts from its list entry when the list is cached (`initialData`), so opening a tile or switching paints at once.

**Deviations from the design:** see [plan §2](../docs/FRONTEND-PLAN.en.md#2-design-vs-api-conflicts-decide-before-building); additions below in Decisions.

## 7. Progress

| ID | Status | Notes |
|---|---|---|
| NFR-1 | ✅ | React 19 + TS strict + Vite; `no-explicit-any` is an error; `lint`, `typecheck`, `test` and `build` pass (phase 2) |
| NFR-7 | ⚠️ | Only the JWT is persisted (`partialize`), `no-console` is an error, Authorization never logged. Markdown without raw HTML comes with the AI UI (phase 7) |
| NFR-8 | ✅ | Folder structure per plan §4; API layer in `src/api/` typed from `types/api.ts`; `fetch` banned outside `src/api/` by ESLint |
| NFR-5 | ⚠️ | Components: labelled fields, `:focus-visible` rings, Radix dialogs and menus, icon-only buttons named by type, axe clean in unit tests. Shell (phase 3): skip link, `<nav aria-label="Main">`, `<main id="main">`, one h1 per page, focus to the h1 on route change, `aria-current`, `aria-expanded` on the hamburger and menus. Still: DnD keyboard alternative (phases 5–6), Lighthouse ≥ 95 audit (phase 8) |
| AUTH-1 | ✅ | Name, email, password, confirm; zod on blur/submit (required, email, ≥ 8, match); `details[]` under fields; 409 under Email; loading button can't double-submit; success signs in → `/projects` + welcome toast |
| AUTH-2 | ✅ | Email + password; 401 shows the server message above the form; success → `?redirect=` (sanitised) or `/projects` |
| AUTH-3 | ✅ | Token persisted in `localStorage` (`kanbot.token`, token only); on start `GET /auth/me` behind a full-page loader; 401 clears the token and shows login |
| AUTH-4 | ✅ | Log out in the sidebar profile menu: clears token, UI stores and cache, goes to `/login` |
| AUTH-5 | ✅ | `ProtectedRoute` → `/login?redirect=<page>`; `GuestRoute` sends signed-in users from `/login`, `/register`, `/forgot-password` to the app |
| AUTH-6 | ✅ | Any 401 except login (when a token was sent) → non-dismissable dialog → "Log in again" → `/login?redirect=<current page>` with "Your session has expired. Please log in again." |
| PRJ-1 | ✅ | A tile per project: name, key, description, backlog count, active sprint name (or "No active sprint"); empty state with **Create your first project**; skeleton, page error, local search with "No projects match" |
| PRJ-2 | ✅ | Dialog: name required, key optional (2–6 letters, uppercased as typed; empty → the server generates it, previewed live), description. 409 → "This key is already used" under Key. Success → the new project's backlog |
| PRJ-3 | ✅ | Edit from the tile menu: name, key and description, with "Changing the key doesn't change existing todo keys." |
| PRJ-4 | ✅ | Confirmation naming the project and warning that its todos and sprints are deleted; then the Projects list with a toast (optimistic, restored on failure) |
| PRJ-5 | ✅ | Sidebar switcher lists every project and opens the chosen one (on the same page); the project id is in the URL, so a reload keeps it |
| BL-1…4, BL-6 | ⏳ | Phase 4 |
| BL-5, BL-7, SPR-1…3 | ⏳ | Phase 5 |
| SPR-4…7 | ⏳ | Phase 6 |
| AI-1…5 | ⏳ | Phase 7 |
| NFR-4 | ⚠️ | Shell: ≥ 1024px full sidebar, 761–1023px icon rail (the sidebar collapses), ≤ 760px top bar + hamburger; the Projects grid reflows. The board's horizontal scroll comes with the board (phase 6). Not yet checked in a real browser at 1440/1024/768/390 |
| NFR-2, NFR-3 | ⚠️ | Done for Projects and the shell (skeleton / empty / error, toasts and loading buttons on every mutation, confirm on delete); per page in later phases |
| NFR-6 | ⚠️ | Hover/focus prefetch of the project and its page chunk; project detail seeded from the list. Parallel loading for board and backlog comes with those pages |
| NFR-9 | ⏳ | Audited in phase 8 |

## 8. Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-03 | **TypeScript 6.0**, not the 7.0 that `create-vite` installs | `typescript-eslint` (type-checked rules) supports `<6.1`; TS 7 has no compatible JS API yet |
| 2026-11-03 | **Node 24** for the client (`.nvmrc`, `engines: ^22.22.2 \|\| >=24.15.0`), not 20 as in the plan | jsdom 30, its undici, vitest 5 and msw 3 all require Node 22+; on Node 20 CI test workers crash (`createZstdDecompress` is missing). The server keeps its own `>=20` |
| 2026-11-03 | **ESLint 9**, not 10; removed the scaffold's `oxlint` | `eslint-plugin-jsx-a11y` peers on `eslint ≤ 9`; the plan asks for ESLint + jsx-a11y |
| 2026-11-03 | A `401` expires the session only when a token was sent (and never for `/auth/login`) | Avoids a "session expired" dialog for a visitor who was never signed in |
| 2026-11-03 | A non-JSON 5xx is reported as `NETWORK_ERROR` | The API always returns `ApiErrorBody`; anything else is the dev/preview proxy saying the server is down |
| 2026-11-03 | URLs are built against `window.location.origin` | `VITE_API_URL` can be relative (`/api`) or absolute; the same code works in the browser and in tests |
| 2026-11-03 | No IBM Plex Sans Arabic | The app is English only (NFR-9); Inter is self-hosted, and the `unicode-range` subsets mean only Latin is downloaded |
| 2026-11-03 | No font `<link rel=preload>` | Fontsource file names are hashed by Vite; the font is discovered from the CSS in `<head>`. Revisit in phase 8 if LCP needs it |
| 2026-11-03 | Logo colors are tokens (`--logo-bg/fg/accent`) | Keeps hex colors in `tokens.css` only |
| 2026-11-03 | Hex and logical-property checks for CSS run as `scripts/check-css.mjs` inside `npm run lint` | No stylelint dependency. A Vitest `?raw` import returns CSS Modules as class maps, so a plain Node script is the reliable place |
| 2026-11-03 | `.gitattributes` at the repo root (`* text=auto eol=lf`) | Stops LF/CRLF churn on Windows for the whole repo |
| 2026-11-03 | Dialog header and footer follow the **canvas** (16 24 padding with a divider line) rather than DESIGN §7's "24 24 0 / 16 24 24" | Every dialog artboard (New project, Sprint form, Todo details) draws them that way; the canvas is the reference for look |
| 2026-11-03 | `ConfirmDialog` is 420px (the Session-expired width) and confirms with the `danger` button variant | The design has no confirm dialog (it used Undo, see plan §2 #6); reusing an existing width and variant avoids inventing new ones |
| 2026-11-03 | A loading button uses `aria-disabled`, not `disabled` | A natively disabled button drops keyboard focus to `<body>` mid-save; `aria-disabled` keeps focus and the click handler is skipped instead |
| 2026-11-03 | Menus focus their first item on mouse open too | DESIGN §10.3 says "focus the first item on open"; Radix does it only for keyboard opens and keeps `onOpenAutoFocus` private on DropdownMenu, so the first focus of the panel after opening is forwarded to the first enabled item |
| 2026-11-03 | Dialogs remember the focused element on open and refocus it on close (`useReturnFocus`), and set `aria-modal="true"` themselves | Radix modal dialogs return focus only to a `Dialog.Trigger` (to `<body>` without one) and don't set `aria-modal`; our dialogs are controlled and usually have no Trigger |
| 2026-11-03 | In CSS Modules the shared keyframes are written `animation: global(kbSpin) …`; `scripts/check-css.mjs` rejects a bare `kbX` there | CSS Modules rename keyframe names to local ones (`_kbSpin_2afvj_1`), which have no `@keyframes`, so Spinner, Skeleton, Dialog and Menu animations silently didn't run. The keyframes stay global in `motion.css` (DESIGN §8.3 verbatim) |
| 2026-11-03 | Added a `sm` (28px) Button size | The canvas uses 28px buttons in banners, composers and the save-error bar |
| 2026-11-03 | `Field` wires controls through context, not a render prop | `<Field label error><Input {...register('x')} /></Field>` stays one line with react-hook-form; explicit `id`/`aria-*` on the control still win |
| 2026-11-03 | `/__ui` exists only under `import.meta.env.DEV` | Vite replaces the flag with `false` in `vite build`, so the route and its lazy chunk are dropped from production |
| 2026-11-03 | The login 401 banner shows the **server** message ("Incorrect email or password."), not the canvas copy | AUTH-2 asks for the server message; the API contract and AC outrank the design |
| 2026-11-03 | The register meter has the **canvas's four levels** (Too short / Fair / Good / Strong: danger → warning → info → success), not DESIGN §9's three | The canvas is the reference for look and is a superset; "Too short" matches the server's 8-character minimum |
| 2026-11-03 | `SessionExpiredDialog` lives in the private layout route, not with the global hosts | Only private pages make authenticated calls. There it unmounts by itself when "Log in again" goes to `/login`, and the page stays mounted behind it until then |
| 2026-11-03 | A stale token on **startup** skips the dialog and goes straight to `/login?redirect=` with the expired message | AUTH-3 says "401 → clear the token and show login"; a dialog over a loader the user never got past is an extra click with nothing behind it |
| 2026-11-03 | `sessionExpired` stays set until the next sign in, and the login page shows the message while it is set | Survives the trip from the dialog to `/login` without a URL flag and disappears on success. Not persisted, so a reload clears it |
| 2026-11-03 | `signedOut` flag in the session store | After Log out the private guard would otherwise send the user to `/login?redirect=<page they left>`; AUTH-4 says `/login`. Cleared by the next sign in |
| 2026-11-03 | Every sign-in starts with `queryClient.clear()` and seeds `['me']` from the response | No data from a previous user or session can show after logging in, and the guard needs no second `/auth/me` |
| 2026-11-03 | `?redirect=` is sanitised (`safeRedirect`) and carried across Log in ↔ Sign up ↔ Forgot password | Blocks open redirects (`//evil.example`) and loops to guest pages; a visitor who detours through Sign up still lands where they were going |
| 2026-11-03 | Toasts default to 3.2s (5s with an action), per DESIGN §7, and pause on hover/focus | The store had one 5s default. Pausing keeps "Undo" reachable for keyboard and slow pointer users (WCAG 2.2.1) |
| 2026-11-03 | No "expires in 30 minutes" on Forgot password, and no "30 minutes of inactivity" in the session dialog | Nothing is sent and server tokens last 7 days; the copy shouldn't claim either |
| 2026-11-03 | Until phase 3: `/` → `/projects`, every `/projects/*` path shows a placeholder, unknown paths go to `/` | The guards and `?redirect=` deep links can be tested end to end now; the 404 page is phase 8 |
| 2026-11-03 | Page titles use React 19 `<title>` inside the page | Hoisted to `<head>` with no helper or library |
| 2026-11-03 | Removed the phase-0 `FoundationsPage` | Its own comment said it is replaced in phase 2 |
| 2026-11-03 | `SessionExpiredDialog` and `PageError` are `lazy()` inside `ProtectedRoute` | They show only after a 401 or a failed `/auth/me`, but as static imports they put Radix AlertDialog in every visit's startup bundle (133.8 KB gz, over the ~120 KB target of plan §5.4); lazy, it is 119.4 KB and the dialog chunk is 14 KB. The dialog has no Suspense fallback (the page stays as it is for that moment); the error falls back to the full-page loader |
| 2026-11-03 | Sidebar order follows the canvas: switcher, "Project" section (Backlog, Active Sprint, Sprints), divider, Projects. The project section shows only when the URL has a project; on `/projects` the switcher says "Choose a project" | DESIGN §6: those items "need a current project", and the current project is the URL (PRJ-5) — no remembered "last project" to drift from it |
| 2026-11-03 | The bottom of the sidebar is a **profile menu** (avatar, name, email → Log out) plus the theme toggle, instead of the canvas's separate Log out icon button | The phase-3 brief asks for a profile menu; it also keeps Log out one deliberate step away |
| 2026-11-03 | The switcher menu ends with **View all projects** (canvas: "Create project"), and switching keeps the current page (board → board) | PRJ-5 and the brief; creating lives on Projects. Keeping the page is what a switcher on the board is used for |
| 2026-11-03 | Tablet (761–1023px) collapses the sidebar to a 64px icon rail; ≤ 760px uses the mobile bar (DESIGN §13) | NFR-4 asks for a collapsed sidebar at 768px while DESIGN §13 keeps the full structure above 760px; the rail satisfies both. Labels stay in the DOM for screen readers |
| 2026-11-03 | Focus moves to the new page's h1 after a navigation, but not on first load, on redirects (`REPLACE`) or when only the query string changes | Plan §9.3. On first load the skip link stays the first Tab stop; `?q=` / `?todo=` changes aren't page changes |
| 2026-11-03 | Ask AI shows in the page headers and the mobile bar only inside a project | The chat endpoint is per project (`/projects/:id/ai/chat`); the Projects page has no project to talk about |
| 2026-11-03 | Offline banner copy is DESIGN §11's "Changes will sync when you reconnect", not the canvas's "saved on this device" | Paused mutations live in memory; saying they are saved on the device would be untrue after a reload |
| 2026-11-03 | **Retry now** pings `GET /health` (`networkMode: 'always'`) and, if it answers, calls `onlineManager.setOnline(true)` | The browser's `online` event can lag; a real request is the honest check, and TanStack then resumes the paused queries and mutations itself (plan §2 #13) |
| 2026-11-03 | Tile ⋯ menu is Open / Edit / Delete (canvas: Open backlog / Open active sprint / Delete project) | PRJ-3 needs an Edit entry point; Delete confirms (plan §2 #6) instead of the design's Undo toast |
| 2026-11-03 | No progress bar on project tiles | DESIGN §7 lists one, but `ProjectWithStats` has no points, and the canvas tile doesn't draw one |
| 2026-11-03 | Key: optional on create, required on edit, letters only (`^[A-Z]{2,6}$`), uppercased as typed; name ≤ 80 | API contract over DESIGN §9 12 (2–5 `[A-Z0-9]`, name ≤ 60; plan §2 #3, #12). An empty key on edit has no meaning on the server, so it must stay valid |
| 2026-11-03 | The key preview mirrors the server's `keyFromName` **and** its KANA/KANB… collision loop, using the keys in the projects cache | "Todos will be numbered KANA-1" is what the server really does when KAN is taken; showing KAN would be wrong |
| 2026-11-03 | No "Template" select and no "Generate a starter backlog with AI" in New project | No API for templates; the AI starter backlog is phase 7 (plan §9.4) |
| 2026-11-03 | `kbAdded` on a new project plays when the user comes back to Projects (`stores/highlight`) | PRJ-2 sends the user straight to the new backlog, so the highlight can't play at creation; it plays once on the next visit, then clears |
| 2026-11-03 | Project search is local, not debounced, and kept in `?q=` (replace, not push) | The list is already loaded; plan §5.2 keeps search in the URL; typing shouldn't fill the history |
| 2026-11-03 | Project avatar hue = hash of the project id over the canvas palette (purple, teal, green, orange, magenta, blue) | The same color on the tile, in the switcher and in the form preview, without storing anything |
| 2026-11-03 | `useProject(id)` starts from the list entry (`initialData` + the list's `dataUpdatedAt`) | Switching or opening a tile paints the header at once; the detail still refetches when stale |
| 2026-11-03 | A project id the API returns 404 for shows PageError inside `ProjectLayout`; unknown paths still go to `/` | The 404 page is phase 8 |
| 2026-11-03 | `Menu` got `onCloseAutoFocus`, `MenuItem` got `onFocus` | A dialog opened from a menu item (Edit, Delete) opens once the menu has handed focus back to ⋯, so the dialog returns focus there. Radix focuses items on hover too, so `onFocus` drives the switcher prefetch |
| 2026-11-03 | `PageHeader`, `ProjectMeta`, `ProjectAvatar` and `AskAiButton` live in `components/`; the shell lazy-imports `features/ai/AssistantDrawer` | Several features use them (plan §4: features don't import each other). The drawer is the one exception: the shell owns its slot, and phase 7 fills it |
| 2026-11-03 | Backlog / Board / Sprints placeholders live where the real pages will (`features/backlog`, `board`, `sprints`) | Phases 4–6 replace the files; routes, prefetch and nav stay as they are |
| 2026-11-03 | axe in unit tests runs with `color-contrast` and `region` off | jsdom has no layout/canvas to measure color, and a lone component is not a page. Contrast comes from the DESIGN token table and is checked again with Lighthouse in phase 8 |

## 9. Enhancements

_Filled in as they land (tests, CI, a11y checks…)._ So far: CI (`.github/workflows/client.yml`), unit tests for the API layer and stores with MSW, component tests with axe checks, the dev-only `/__ui` component catalogue in both themes, app-level auth tests on the real routes, open-redirect protection on `?redirect=`, cross-tab log in / log out sync, and a forgot-password flow (frontend only).

## 10. Testing & CI

- Unit: Vitest + Testing Library + MSW (`src/test/setup.ts` fails any unhandled request). Covered now: `request()` (token, body, query, 204, ApiError, 401 → expire, login 401, network error, proxy 5xx, timeout, cancel), `fieldErrors`, stores (session, toast, announcer, theme), `Icon` / `TypeIcon` a11y.
- Components (phase 1): Button loading/disabled (name, `aria-busy`, focus kept, clicks and implicit submit blocked, width-keeping layers), IconButton name and its type-level `aria-label`; Field wiring of `aria-describedby` / `aria-invalid` / `aria-required` for every control; TagInput keys and announcements; Dialog autofocus, Tab trap, Esc and × with focus restore, controlled veto; ConfirmDialog Cancel focus and pending lock; Menu ↑ ↓ Home End, disabled skip, wrap, Enter, Esc with focus back on the trigger. Each runs `vitest-axe` (`src/test/axe.ts`).
- Auth (phase 2, `features/auth/auth.test.tsx`: the whole app on a memory router with MSW): guard redirects (signed-out → `/login?redirect=`, signed-in → away from `/login` and `/register`, unsafe `?redirect=` ignored); login 401 banner + `aria-invalid`, cleared on edit; client validation with focus and the live-region summary; login → `?redirect=` with a trimmed email; register 409 under Email with focus; server `details[]` under Name; password match and strength; register → welcome toast; token persisted on login; reload with a saved token (loader during `/auth/me`, Bearer sent); a failed `/auth/me` → page error → Try again; stale token → login with the message; log out; session expired mid-session (dialog, Esc ignored, focus, Log in again → `/login?redirect=` + message → back to the page); forgot-password validation. Plus `safeRedirect`/`loginPath`, `passwordStrength`, `registerSchema`, the Toaster (timing, action, pause, Dismiss, axe), LiveRegion, `signedOut` and cross-tab sync.
- Shell and Projects (phase 3: `features/shell/shell.test.tsx`, `features/projects/projects.test.tsx`, `lib/projectKey.test.ts`): landmarks, one h1, skip link, `aria-current` on the active nav item (and no project items on `/projects`), focus to the h1 after navigating, `/projects/:id` → backlog, unknown project → page error; switcher navigation (same page, "View all projects"); Log out from the profile menu; hamburger `aria-expanded` + Esc; Ask AI opens the drawer; offline banner + "Back online" toast. Projects: skeleton → tiles with their stats, empty state, page error + Try again, search by name/key with no-match + Clear search; create with the key preview (KANA when KAN is taken), uppercasing, 409 under Key, then the new backlog + toast; client validation; edit with the key hint and the PATCH body; delete confirm (name, todos, sprints), removal + toast, rollback on a failed delete. `keyFromName` / `generatedKey` against the server's cases.
- CI: `.github/workflows/client.yml` runs `npm ci → lint → typecheck → test → build` on every PR and on `main`. E2E job joins in phase 9.

## 11. Known issues

- `npm audit` reports 13 moderate advisories in dev dependencies after install; not reviewed yet.
- Backlog, Active Sprint and Sprints are placeholder pages (PageHeader + EmptyState) until phases 4–6.
- Unknown paths redirect to `/`, and an unknown project id shows the page error, instead of the 404 page (phase 8).
- After deleting a project, focus falls back to `<body>`: the ⋯ button that opened the confirm left with its tile.
- The tablet icon rail has no tooltips on its icons (the names are there for screen readers only).
- Forgot password sends nothing — there is no endpoint (plan §10 decision 1); the page says "Demo only".
- The theme does not follow OS changes after load (only the initial default does).
- In `/__ui`, dialogs and menus portal to `<body>`, so they follow the global theme (header toggle), not the pane they were opened from.
- `vitest-axe@0.1.0` ships type augmentations for an old Vitest, so its `toHaveNoViolations` matcher isn't used; `expectNoAxeViolations()` asserts on the violations list instead.
- The unsaved-changes confirm bar isn't built yet: it comes with Todo details (phase 4). The Toast and LiveRegion hosts landed in phase 2.
- Not checked in a real browser in this session: the auth screens, the shell (1440/1024/768/390, both themes, the mobile nav panel, the rail) and Projects against the canvas, and the dialog/drawer/toast motion. Worth a look before merging.

## 12. Demo

_Recorded in phase 8._
