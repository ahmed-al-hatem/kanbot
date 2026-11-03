<p align="center"><img src="../design/logo/kanbot-logo.png" alt="Kanbot" width="300"></p>

# Kanbot — client

> React app for Kanbot, a sprint board with an AI teammate. Built phase by phase from
> [`docs/FRONTEND-PLAN.en.md`](../docs/FRONTEND-PLAN.en.md); the API in [`server/`](../server/) is the contract.

**Status:** Phase 1 — design system components. No product screens yet; `/` shows the phase-0 placeholder, and in dev `/__ui` shows every component and state in both themes.

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
├── router.tsx          # createBrowserRouter, lazy routes (placeholder in phase 0)
├── app/                # Providers (QueryClient + Router), queryClient
├── api/                # client.ts (request<T>), errors.ts (ApiError), auth/projects/todos/sprints/ai.ts
├── hooks/              # queryKeys.ts (one key factory); query/mutation hooks per phase
├── stores/             # Zustand UI state: session, theme, toast, announcer
├── components/         # design system, one folder per component (see §6)
├── dev/                # UiPage: the /__ui catalogue, dev server only
├── features/           # one folder per area; todos/TypeIcon so far
├── lib/                # storage.ts (localStorage that never throws), cx.ts (class names)
├── styles/             # tokens.css, base.css, motion.css
├── test/               # setup.ts, MSW server
└── types/api.ts        # verbatim copy of server/src/types/api.ts — never edited by hand
```

**State rules (plan §5.2).** Server data lives only in TanStack Query. Zustand holds UI state only: `session` (token + `sessionExpired`; only the token is persisted), `theme` (persisted as `kanbot.theme`), `toast` (one at a time, callable as `toast.error(…)` from a mutation), `announcer` (live-region messages). `signOut()` resets the UI stores and calls `queryClient.clear()`.

**API layer.** `request<T>(method, path, { body, query, signal, timeoutMs })` is the only `fetch` in the app (enforced by ESLint):

- adds `Authorization: Bearer <token>` and `Content-Type`; builds the query string, skipping empty values;
- `204` → `undefined`; non-2xx → `ApiError { status, code, message, details }` from `ApiErrorBody`;
- no response → `NETWORK_ERROR` ("Cannot reach the server. Is it running?"); over the timeout (15 s, 45 s for AI) → `TIMEOUT`; a cancel from TanStack Query is rethrown untouched so it stays a cancel;
- `401` on an authenticated request (except `/auth/login`) → `useSession.getState().expire()` (AUTH-6);
- `fieldErrors(err)` maps validation `details` to `{ field: message }` for `setError`.

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

**Deviations from the design:** see [plan §2](../docs/FRONTEND-PLAN.en.md#2-design-vs-api-conflicts-decide-before-building); additions below in Decisions.

## 7. Progress

| ID | Status | Notes |
|---|---|---|
| NFR-1 | ✅ | React 19 + TS strict + Vite; `no-explicit-any` is an error; `lint`, `typecheck`, `test` (69) and `build` pass (phase 1) |
| NFR-7 | ⚠️ | Only the JWT is persisted (`partialize`), `no-console` is an error, Authorization never logged. Markdown without raw HTML comes with the AI UI (phase 7) |
| NFR-8 | ✅ | Folder structure per plan §4; API layer in `src/api/` typed from `types/api.ts`; `fetch` banned outside `src/api/` by ESLint |
| NFR-5 | ⚠️ | Component level done: labelled fields with `aria-describedby`/`aria-invalid`, visible `:focus-visible` rings, dialogs with focus trap / Esc / restore (Radix), keyboard menus, icon-only buttons named by type, priority/type chips carry text or an icon, contrast from the DESIGN token table; axe clean in unit tests. Still per screen: landmarks and headings (phase 3+), DnD keyboard alternative (phases 5–6), Lighthouse ≥ 95 audit (phase 8) |
| AUTH-1…6 | ⏳ | Phase 2 (`expire()` on 401 is ready) |
| PRJ-1…5 | ⏳ | Phase 3 |
| BL-1…4, BL-6 | ⏳ | Phase 4 |
| BL-5, BL-7, SPR-1…3 | ⏳ | Phase 5 |
| SPR-4…7 | ⏳ | Phase 6 |
| AI-1…5 | ⏳ | Phase 7 |
| NFR-2…4, NFR-6, NFR-9 | ⏳ | Built per phase, audited in phase 8. Phase 1 ships the pieces for NFR-2 (Skeleton, EmptyState, PageError) and NFR-3 (button loading, Banner, ConfirmDialog) |

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
| 2026-11-03 | axe in unit tests runs with `color-contrast` and `region` off | jsdom has no layout/canvas to measure color, and a lone component is not a page. Contrast comes from the DESIGN token table and is checked again with Lighthouse in phase 8 |

## 9. Enhancements

_Filled in as they land (tests, CI, a11y checks…)._ So far: CI (`.github/workflows/client.yml`), unit tests for the API layer and stores with MSW, component tests with axe checks, and the dev-only `/__ui` component catalogue in both themes.

## 10. Testing & CI

- Unit: Vitest + Testing Library + MSW (`src/test/setup.ts` fails any unhandled request). Covered now: `request()` (token, body, query, 204, ApiError, 401 → expire, login 401, network error, proxy 5xx, timeout, cancel), `fieldErrors`, stores (session, toast, announcer, theme), `Icon` / `TypeIcon` a11y.
- Components (phase 1): Button loading/disabled (name, `aria-busy`, focus kept, clicks and implicit submit blocked, width-keeping layers), IconButton name and its type-level `aria-label`; Field wiring of `aria-describedby` / `aria-invalid` / `aria-required` for every control; TagInput keys and announcements; Dialog autofocus, Tab trap, Esc and × with focus restore, controlled veto; ConfirmDialog Cancel focus and pending lock; Menu ↑ ↓ Home End, disabled skip, wrap, Enter, Esc with focus back on the trigger. Each runs `vitest-axe` (`src/test/axe.ts`).
- CI: `.github/workflows/client.yml` runs `npm ci → lint → typecheck → test → build` on every PR and on `main`. E2E job joins in phase 9.

## 11. Known issues

- `npm audit` reports 13 moderate advisories in dev dependencies after install; not reviewed yet.
- `/` is a phase-0 placeholder; every route renders it until phase 2.
- The theme does not follow OS changes after load (only the initial default does).
- In `/__ui`, dialogs and menus portal to `<body>`, so they follow the global theme (header toggle), not the pane they were opened from.
- `vitest-axe@0.1.0` ships type augmentations for an old Vitest, so its `toHaveNoViolations` matcher isn't used; `expectNoAxeViolations()` asserts on the violations list instead.
- Toast host (Flag), LiveRegion host and the unsaved-changes confirm bar are not built yet: they come with auth and the shell (phases 2–3) and Todo details (phase 4).

## 12. Demo

_Recorded in phase 8._
