<p align="center"><img src="../design/logo/kanbot-logo.png" alt="Kanbot" width="300"></p>

# Kanbot — client

> React app for Kanbot, a sprint board with an AI teammate. Built phase by phase from
> [`docs/FRONTEND-PLAN.en.md`](../docs/FRONTEND-PLAN.en.md); the API in [`server/`](../server/) is the contract.

**Status:** Phase 0 — tooling and foundations. No product screens yet; `/` shows a placeholder that exercises tokens, fonts, icons and the theme store.

---

## 1. Overview

_Screenshot and feature tour come with the screens (phase 8)._

## 2. Getting started

Requirements: Node 20+ (`.nvmrc`), the server running on port 4000.

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
| `npm run lint` | ESLint (zero warnings) + `scripts/check-css.mjs` (no hex outside `tokens.css`, logical properties only) |
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
├── components/         # design system (Icon, Logo; the rest in phase 1)
├── features/           # one folder per area; todos/TypeIcon so far
├── lib/                # storage.ts (localStorage that never throws)
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

**Deviations from the design:** see [plan §2](../docs/FRONTEND-PLAN.en.md#2-design-vs-api-conflicts-decide-before-building); additions below in Decisions.

## 7. Progress

| ID | Status | Notes |
|---|---|---|
| NFR-1 | ⚠️ | React 19 + TS strict + Vite in place; `no-explicit-any` is an error. Pending your `lint` / `build` run |
| NFR-7 | ⚠️ | Only the JWT is persisted (`partialize`), `no-console` is an error, Authorization never logged. Markdown without raw HTML comes with the AI UI (phase 7) |
| NFR-8 | ✅ | Folder structure per plan §4; API layer in `src/api/` typed from `types/api.ts`; `fetch` banned outside `src/api/` by ESLint |
| AUTH-1…6 | ⏳ | Phase 2 (`expire()` on 401 is ready) |
| PRJ-1…5 | ⏳ | Phase 3 |
| BL-1…4, BL-6 | ⏳ | Phase 4 |
| BL-5, BL-7, SPR-1…3 | ⏳ | Phase 5 |
| SPR-4…7 | ⏳ | Phase 6 |
| AI-1…5 | ⏳ | Phase 7 |
| NFR-2…6, NFR-9 | ⏳ | Built per phase, audited in phase 8 |

## 8. Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-03 | **TypeScript 6.0**, not the 7.0 that `create-vite` installs | `typescript-eslint` (type-checked rules) supports `<6.1`; TS 7 has no compatible JS API yet |
| 2026-11-03 | **ESLint 9**, not 10; removed the scaffold's `oxlint` | `eslint-plugin-jsx-a11y` peers on `eslint ≤ 9`; the plan asks for ESLint + jsx-a11y |
| 2026-11-03 | A `401` expires the session only when a token was sent (and never for `/auth/login`) | Avoids a "session expired" dialog for a visitor who was never signed in |
| 2026-11-03 | A non-JSON 5xx is reported as `NETWORK_ERROR` | The API always returns `ApiErrorBody`; anything else is the dev/preview proxy saying the server is down |
| 2026-11-03 | URLs are built against `window.location.origin` | `VITE_API_URL` can be relative (`/api`) or absolute; the same code works in the browser and in tests |
| 2026-11-03 | No IBM Plex Sans Arabic | The app is English only (NFR-9); Inter is self-hosted, and the `unicode-range` subsets mean only Latin is downloaded |
| 2026-11-03 | No font `<link rel=preload>` | Fontsource file names are hashed by Vite; the font is discovered from the CSS in `<head>`. Revisit in phase 8 if LCP needs it |
| 2026-11-03 | Logo colors are tokens (`--logo-bg/fg/accent`) | Keeps hex colors in `tokens.css` only |
| 2026-11-03 | Hex and logical-property checks for CSS run as `scripts/check-css.mjs` inside `npm run lint` | No stylelint dependency. A Vitest `?raw` import returns CSS Modules as class maps, so a plain Node script is the reliable place |
| 2026-11-03 | `.gitattributes` at the repo root (`* text=auto eol=lf`) | Stops LF/CRLF churn on Windows for the whole repo |

## 9. Enhancements

_Filled in as they land (tests, CI, a11y checks…)._ So far: CI (`.github/workflows/client.yml`), unit tests for the API layer and stores with MSW.

## 10. Testing & CI

- Unit: Vitest + Testing Library + MSW (`src/test/setup.ts` fails any unhandled request). Covered now: `request()` (token, body, query, 204, ApiError, 401 → expire, login 401, network error, proxy 5xx, timeout, cancel), `fieldErrors`, stores (session, toast, announcer, theme), `Icon` / `TypeIcon` a11y.
- CI: `.github/workflows/client.yml` runs `npm ci → lint → typecheck → test → build` on every PR and on `main`. E2E job joins in phase 9.

## 11. Known issues

- `npm audit` reports 13 moderate advisories in dev dependencies after install; not reviewed yet.
- `/` is a phase-0 placeholder; every route renders it until phase 2.
- `vitest-axe` is installed but unused until component tests in phase 1+.
- The theme does not follow OS changes after load (only the initial default does).

## 12. Demo

_Recorded in phase 8._
