# Kanbot: Frontend Plan (EN)

> The working reference for building `client/`. It combines three sources:
> [REQUIREMENTS](REQUIREMENTS.en.md) (what gets tested) · [IMPLEMENTATION-PLAN](IMPLEMENTATION-PLAN.en.md) (the API contract) · **Design: [Kanbot design canvas](https://claude.ai/code/artifact/efe99d87-baac-4bb7-96e1-235363299397)** and its written spec [DESIGN.md](../design/DESIGN.md).
>
> **Priority when sources conflict:** the API contract (`server/src/types/api.ts` + zod schemas) → the Requirements (acceptance criteria, AC) → the design.
> The backend must not change, and the review tests the AC (40%). Anything in the design that the API doesn't support is adapted or deferred, and documented in the README.
>
> Arabic version: [FRONTEND-PLAN.ar.md](FRONTEND-PLAN.ar.md).

---

## 0. Design source

**Visual and behavioral reference:** https://claude.ai/code/artifact/efe99d87-baac-4bb7-96e1-235363299397

- The canvas holds **56 artboards** (54 screens/states + `H00 Handoff spec` + `H01 User flow`), in light and dark, at 1440 (desktop) and 390 (mobile).
- Every artboard renders **one interactive prototype**, `project/Main.dc.html`, passing it three props: `screen`, `mode` (`light` | `dark`) and `variant` (the state). When building a screen, review `Main.dc.html` for that `screen`, not the small artboard files.
- `H00 Handoff spec` has the same content as [DESIGN.md](../design/DESIGN.md) (tokens, components, motion, keyboard, states). **DESIGN.md is the authoritative text for values**; the canvas is the reference for actual look and interaction.
- `H01 User flow` is the same diagram as DESIGN.md §6b.
- Access: Claude reads the files with the Artifact tool (`read` with a path, e.g. `project/Main.dc.html`). The greyscale wireframes in `design/wireframes/` are older and cover content only; the canvas takes precedence.

### 0.1 Screens → routes → phases

| `screen` in Main.dc.html | Artboards | Route / surface | Phase |
|---|---|---|---|
| `login` | L/D 01, M01 (mobile) | `/login` | 2 |
| `forgot` | S02 | `/forgot-password` (frontend only, §10) | 2 |
| `register` | L/D 02 | `/register` | 2 |
| `projects` · `projects-empty` | L/D 03, 03b | `/projects` | 3 |
| `newProject` | L/D 12 | Dialog over Projects | 3 |
| `backlog` | L/D 04, M02 | `/projects/:projectId/backlog` | 4–5 |
| `todo` | L/D 06 | Dialog `?todo=<id>` | 4 |
| `sprintForm` | L/D 13 | Dialog (create / edit / start) | 5 |
| `board` | L/D 05, M03 | `/projects/:projectId/board` | 6 |
| `complete` | L/D 11 | Dialog over Board | 6 |
| `sprints` | L/D 10 | `/projects/:projectId/sprints/:sprintId?` | 6 |
| `drawer` | L/D 07 | AI drawer on every page | 7 |
| `generate` | L/D 08 | Dialog over Backlog | 7 |
| `plan` | L/D 09 | Dialog over Backlog | 7 |
| `notfound` | S09, M04 | `*` and 404 for a project/todo | 8 |

| `variant` | Artboard | Where it is built | Phase |
|---|---|---|---|
| `login-error` | S01 | 401 banner on Login | 2 |
| `session` | S05 | SessionExpiredDialog | 2 |
| `offline` | S06 | OfflineBanner in the shell | 3 |
| `loading` | S03 | Skeleton per page (same layout) | 1 (component) + every phase |
| `error` | S04 | PageError per page | 1 (component) + every phase |
| `save-error` | S08 | Error bar in Todo details | 4 |
| `ai-error` | S07 | Error panel in Generate todos (and AI in general) | 7 |

**Working rule for every phase:** before building a screen, review its `screen` and `variant` on the canvas in both themes (and mobile where it exists), then compare the result against it before committing.

---

## 1. Current state of `client/`

**`client/` does not exist; we start from scratch.** (An earlier incomplete, undocumented attempt was removed on 2026-11-03.)

The new API layer must cover from day one:
- `ApiError` with `status`, `code`, `message`, `details`, plus `fieldErrors(err)` and a `NETWORK_ERROR` code (plan §3.3).
- `localStorage` reads/writes wrapped in `try/catch` (they throw in some privacy modes).
- `AbortSignal` support (TanStack Query passes a `signal` to cancel requests on navigation/search).
- `index.html` sets the theme class before first paint (no flash).

---

## 2. Design vs API conflicts (decide before building)

| # | Topic | DESIGN.md says | API / Requirements | Decision |
|---|---|---|---|---|
| 1 | Priority | high / medium / low | `urgent` / high / medium / low | Support all four. `urgent` uses `priority-highest`, `--danger-icon` and a text label |
| 2 | Story points | number 0–40 | `1,2,3,5,8,13` or `null` | `<select>` with Fibonacci values + "None" |
| 3 | Project key | 2–5 `[A-Z0-9]`, not editable | `^[A-Z]{2,6}$`, editable (PRJ-3) | Follow the API, with a hint "Changing the key doesn't change existing todo keys" |
| 4 | Assignee / Reporter | On cards, dialog and backlog filter | Doesn't exist (single user) | **Removed** from all UI and filters |
| 5 | Forgot password | Screen 01b | No endpoint (and out of scope) | **Frontend only**, marked "Demo only", documented in README (§10) |
| 6 | Delete | Immediate + Undo toast | PRJ-4 and BL-4: **confirmation** required | Project: `ConfirmDialog` naming it and warning that its todos and sprints go too. Todo: `ConfirmDialog` as well (AC). Undo only for **moves** (§10) |
| 7 | Session expired | Non-dismissable dialog | AUTH-6: redirect to `/login?redirect=` with a message | Both: the dialog → "Log in again" → `/login?redirect=<current>` with "Your session has expired…" |
| 8 | URLs | `/projects/:key/...` and `?todo=KAN-18` | The API works by `id` only | `/projects/:projectId/...` and `?todo=<todoId>` (deep link with no extra key lookup) |
| 9 | Start sprint | Starts immediately | SPR-3: dialog with start (today) and end (+14) | Small dialog in the "Create sprint" style |
| 10 | Progress | Done only | `stats.donePoints` (Done only) | Done only ✔ |
| 11 | Status in Todo details | Disabled unless in the active sprint | The API always allows it | Follow the design (clearer for the user) |
| 12 | Field limits | title 120, goal 160, description 300 | title 200, goal 300, description 500/5000, name 80 | Client zod = **API limits**, so valid values are never rejected |
| 13 | Offline | Edits queued | — | TanStack Query pauses mutations offline (`networkMode: 'online'`) and resumes them; add the banner + a toast on reconnect. No hand-built queue |
| 14 | React | 18 | 19 | React 19 |

---

## 3. Stack and technical decisions (and why)

| Area | Choice | Why |
|---|---|---|
| Styling | **CSS Modules + a global `tokens.css`** (no Tailwind / UI kit) | The design is built entirely on CSS variables. CSS Modules = zero runtime, scoping, and a 1:1 match with DESIGN.md. Easy to justify to the reviewer |
| Primitives | **Radix UI**: `react-dialog`, `react-alert-dialog`, `react-dropdown-menu` | Focus trap, focus restore, Esc, `aria-*`, roving focus in menus: all required by DESIGN §10. Hand-rolling them risks a11y bugs. Radix is unstyled and supports exit animations via `data-state` |
| Icons | **Own `<Icon name>` component + a path map** (option (b) in DESIGN §5.1) | `@atlaskit/icon` pulls in `@atlaskit/tokens` and emotion → heavy. Paths are copied once by a script from `node_modules` (devDependency) into `icons.ts` |
| HTTP client | **Native `fetch`** in one `request<T>()` wrapper in `api/client.ts` (no axios) | 0 KB instead of ~14 KB gz. Interceptors (token, 401) live in the wrapper; retry and cancellation come from TanStack Query (`signal`); timeout via `AbortSignal.any([signal, AbortSignal.timeout(ms)])` (15 s default, 45 s for AI). Axios adds nothing the project needs (no upload progress) |
| Server state | TanStack Query v5 | Cache, optimistic updates, retry, online manager |
| Client state | **Zustand** (+ `persist` middleware) | UI state only (session, theme, toast, announcer, AI chat, drawer state). Selector subscriptions instead of Context re-rendering the whole tree, and callable outside React (e.g. `api/client.ts` on 401). Server data **never** goes in it (plan §3.4) |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | `mode: 'onTouched'` = validate on blur, then on change (matches DESIGN §10.5) |
| Drag and drop | `@dnd-kit/core` + `sortable` | Keyboard sensor + screen-reader announcements |
| Markdown | `react-markdown`, **lazy** | No `rehype-raw` (NFR-7); loaded only when AI UI opens |
| Dates | `Intl.DateTimeFormat` | No need for date-fns |
| Animation | CSS keyframes from DESIGN §8.3 only | No Framer Motion (~40 KB). Exit animations via Radix `data-state=closed` |
| Fonts | `@fontsource-variable/inter`, self-hosted + preload | Removes the Google Fonts round-trip (faster LCP, no FOIT). IBM Plex Sans Arabic stays on Google Fonts with `unicode-range` (downloaded only when Arabic appears) or is dropped, since the app is English only |
| Lint / format | ESLint 9 flat config: `typescript-eslint` (type-checked) + `react-hooks` + `react-refresh` + `jsx-a11y` · Prettier | NFR-1 |
| Tests | Vitest + Testing Library + `@testing-library/user-event` + **MSW** · Playwright for e2e | Listed as an enhancement; raises the code-quality score |
| Optional | `babel-plugin-react-compiler` | Automatic memoization instead of manual `useMemo`/`useCallback` |

---

## 4. Target folder structure

```
client/src/
├── main.tsx                  # createRoot + <Providers><RouterProvider/></Providers>
├── router.tsx                # createBrowserRouter + lazy routes
├── app/                      # QueryClientProvider + RouterProvider + hosts (Toaster, LiveRegion, SessionExpiredDialog)
├── stores/                   # Zustand: session.ts, theme.ts, toast.ts, announcer.ts, assistant.ts
├── api/                      # client.ts + auth/projects/todos/sprints/ai.ts — no fetch outside this folder
├── hooks/                    # queries/mutations: useProjects, useBacklog, useBoard, useMoveTodo...
│   └── queryKeys.ts          # one key factory: qk.project(id), qk.todos(pid, filters)...
├── components/               # design system: Button, IconButton, Field, Input, Select, Textarea,
│                             # DateInput, TagInput, Checkbox, Dialog, ConfirmDialog, Menu, Lozenge,
│                             # Chip, Avatar, ProgressBar, StatTile, Skeleton, Spinner, EmptyState,
│                             # PageError, Banner, Icon, Logo, VisuallyHidden
├── features/
│   ├── auth/                 # LoginPage, RegisterPage, ForgotPasswordPage, ProtectedRoute, GuestRoute, SessionExpiredDialog
│   ├── shell/                # AppShell, Sidebar, ProjectSwitcher, PageHeader, MobileTopBar, SkipLink, OfflineBanner
│   ├── projects/             # ProjectsPage, ProjectTile, ProjectFormDialog
│   ├── backlog/              # BacklogPage, BacklogGroup, TodoRow, QuickCreate, FilterBar, useBacklogDnd
│   ├── board/                # BoardPage, Column, TodoCard, ColumnComposer, SprintHeader, CompleteSprintDialog
│   ├── sprints/              # SprintsPage, SprintList, SprintDetail, SprintFormDialog, StartSprintDialog
│   ├── todos/                # TodoDetailsDialog, TypeIcon, PriorityChip, PointsSelect, todoSchema.ts
│   ├── ai/                   # AssistantDrawer, ChatLog, Composer, GenerateTodosDialog, PlanSprintDialog,
│   │                         # SprintSummaryCard, AiButton, MockBadge, Markdown (lazy)
│   └── errors/               # NotFoundPage, RouteErrorBoundary, AppErrorBoundary
├── lib/                      # format.ts, cx, constants, moveInLists, useDebouncedValue, useDelayedLoading
├── styles/                   # tokens.css, base.css (reset + typography + focus), motion.css (keyframes)
└── test/                     # setup.ts, MSW handlers, render helpers
```

Rule: each feature exports its pages only. Shared components live in `components/`. Features don't import from each other, except `todos/` (shared by backlog and board).

---

## 5. State architecture and performance

### 5.1 Query keys and invalidation
```ts
qk = {
  me: ['me'],
  projects: ['projects'],
  project: (id) => ['project', id],
  todos: (pid, f?) => ['todos', pid, f ?? {}],   // backlog + each sprint (sprintId in the filter)
  sprints: (pid) => ['sprints', pid],
  sprint: (id) => ['sprint', id],
  board: (id) => ['board', id],
  aiStatus: ['ai-status'],
}
```
| Mutation | Invalidate |
|---|---|
| create/update/delete todo | `todos(pid)` (prefix), `project(pid)`, and `board(sid)` when in a sprint |
| move todo | optimistic on the affected list → onSettled: the above + `sprints(pid)` (stats) |
| create/update/delete sprint | `sprints(pid)`, `todos(pid)` |
| start / complete sprint | `sprints(pid)`, `board(sid)`, `todos(pid)`, `project(pid)`, `projects` |
| project CRUD | `projects`, `project(id)` |

### 5.2 Who owns which state

| State | Owner | Notes |
|---|---|---|
| Server data (projects, todos, sprints, board, `me`, ai-status) | TanStack Query | Single source of truth. Never copied into Zustand |
| `token`, `sessionExpired` | `stores/session.ts` (Zustand, `persist` for the token only) | `api/client.ts` reads `useSession.getState().token` and calls `expire()` on 401 directly. `signOut()` clears the token, then `queryClient.clear()` |
| Theme | `stores/theme.ts` (`persist` under `kanbot.theme`) | The `index.html` script stays to avoid a flash; the store reads the existing class as its initial value |
| Toast (one at a time) | `stores/toast.ts` | `toast.show()` can be called from mutation `onError` without a hook |
| Live announcements | `stores/announcer.ts` | `announce('KAN-21 moved to In Progress…')` from DnD handlers |
| AI chat + drawer open/closed | `stores/assistant.ts` | Messages keyed by `projectId` (`Record<projectId, Message[]>`), so switching project gives a fresh chat automatically. `persist` optional ("Save chat history per project") |
| Filters, search, `?todo=` | URL search params | Shareable and survive reload — not Zustand |
| Local form and dialog state | `react-hook-form` / `useState` | Local to the component |

Zustand rules:
- One small store per domain, actions inside the store, hooks used with selectors: `const token = useSession((s) => s.token)`. Never `useSession()` without a selector.
- `useShallow` when selecting more than one value.
- Every store exports a `reset`, called from `signOut()` (clears chats and the toast).
- Tests: `useX.setState(initial)` in `beforeEach`.

### 5.3 No request waterfalls (NFR-6)
- **Board:** `project.stats.activeSprint.id` comes from `GET /projects/:id`, which the shell needs anyway → request `board(activeSprintId)` directly, without waiting for `sprints`.
- **Backlog:** `sprints(pid)` and the todos in parallel. **One** `GET /projects/:id/todos` (no filter), split client-side by `sprintId` with `select`: fewer round-trips and one place for optimistic updates.
- **Prefetch:** on hover/focus of sidebar links and project tiles → `queryClient.prefetchQuery` + `import()` of the route chunk.
- **Route loaders (optional):** React Router loaders call `ensureQueryData`, so fetching starts in parallel with the chunk download.

### 5.4 Code splitting
- Every page is `lazy()` at the route level.
- `AssistantDrawer`, `GenerateTodosDialog`, `PlanSprintDialog` and `Markdown` are lazy (react-markdown + remark ≈ 40–50 KB gz).
- `@dnd-kit` ends up only in the backlog/board chunks.
- Target: initial JS < ~120 KB gz, measured with `rollup-plugin-visualizer`.

### 5.5 Render performance
- `TodoCard` / `TodoRow` wrapped in `memo` (or React Compiler), with stable props (ids, not freshly derived objects).
- Search: `useDeferredValue` + 300 ms debounce, value kept in the URL (`?q=&priority=&type=`).
- `placeholderData: keepPreviousData` for search so the list doesn't flash.
- Skeleton appears after 150 ms and stays ≥ 300 ms (`useDelayedLoading`), per DESIGN §11.
- No virtualization (lists are small); stated as a deliberate choice in the README.

### 5.6 Optimistic drag and drop (BL-5, SPR-5)
`onMutate`: `cancelQueries` → snapshot → move the item in the cache (remove from source, insert at `position`) → `onError`: restore + toast "Couldn't move KAN-12" → `onSettled`: invalidate.
`position` = the index in the target list **after** removing the dragged item (plan §3.5). The move logic is a pure function `moveInLists()` in `lib/`, unit-tested.

---

## 6. Implementation phases (small commits / PRs)

Every phase ends with a working app and a clean `npm run lint && npm run typecheck && npm run build`.

### Phase 0 — Tooling and foundations
- Create the project and copy the API contract (you run this, from the `kanbot/` root):
  ```bash
  npm create vite@latest client -- --template react-ts
  cd client
  cp ../server/src/types/api.ts src/types/api.ts
  ```
- Install packages (you run this):
  ```bash
  npm i react-router @tanstack/react-query @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-markdown
  npm i react-hook-form zod @hookform/resolvers zustand @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-dropdown-menu @fontsource-variable/inter
  npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-plugin-jsx-a11y globals prettier vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw @atlaskit/icon @atlaskit/icon-lab rollup-plugin-visualizer
  ```
- `src/vite-env.d.ts` typing `ImportMetaEnv` (`VITE_API_URL`).
- `.nvmrc` = `20` and `engines` in `package.json` (same as the server).
- `@/` → `src/` alias in `tsconfig` and `vite.config.ts`.
- Vite proxy: `server.proxy` and `preview.proxy` for `/api` → `http://localhost:4000`, `VITE_API_URL=/api`, `strictPort: true` (see §9.1).
- `.gitattributes` with `* text=auto eol=lf` (stops the LF/CRLF warnings on Windows).
- ESLint 9 + Prettier + `.editorconfig` + `lint`, `format`, `test`, `e2e` scripts.
- Vitest + Testing Library + MSW + `test/setup.ts`.
- `styles/tokens.css` (DESIGN §3.2 verbatim + spacing/radius/easing variables), `base.css`, `motion.css` (§8.3 + reduced motion).
- `Icon.tsx` + `icons.ts` (`scripts/extract-icons.mjs` copies paths from `@atlaskit/icon`), `TypeIcon` (Task/Story SVGs from §5.3), `Logo`.
- `main.tsx` (QueryClient: `staleTime: 30s`, `retry` that skips 4xx, `refetchOnWindowFocus` on) and an empty `router.tsx`.
- `api/client.ts`: `request<T>(method, path, { body, signal, timeoutMs })` — adds `Authorization` and `Content-Type`, returns `undefined` on 204, throws `ApiError` on non-2xx, `NETWORK_ERROR` on network failure, `TIMEOUT` on timeout (ignoring the `AbortError` from TanStack Query cancellation), and calls `useSession.getState().expire()` on 401 (except `/auth/login`). Unit-tested with MSW for each case.
- `api/auth.ts`, `projects.ts`, `todos.ts`, `sprints.ts`, `ai.ts`: functions typed from `api.ts` that pass `signal`. AI calls use `timeoutMs: 45_000`.
- Zustand stores (`session`, `theme`, `toast`, `announcer`) as in §5.2. `user` stays the `['me']` query behind `useCurrentUser()`.
- Commits: `chore(client): scaffold vite app with tooling, tokens and icons` · `feat(client): api layer and zustand ui stores`

### Phase 1 — Design system components
Button (all variants; loading keeps width), IconButton (`aria-label` required by its type), Field/Input/Textarea/Select/DateInput/Checkbox/TagInput, Dialog (Radix + widths from §3.5), ConfirmDialog, Menu (Radix DropdownMenu), Lozenge, Chip, PointsPill, Avatar, ProgressBar, StatTile, Skeleton, Spinner, EmptyState, PageError, Banner.
- Unit tests: Button loading/disabled; Field wires `aria-describedby` and `aria-invalid`.
- Commit: `feat(ui): design system components`

### Phase 2 — Auth (AUTH-1…6)
Login, Register (strength meter), Forgot password (frontend only, §10), `ProtectedRoute` / `GuestRoute` with `?redirect=`, full-page loader during `/auth/me`, SessionExpiredDialog, `fieldErrors` → `setError`, focus on the first invalid field, welcome toast.
- Tests: guard redirect, login 401 shows the banner, 409 under email.
- Commit: `feat(auth): login, register, guards and session expiry`

### Phase 3 — Shell + Projects (PRJ-1…5)
AppShell (240 px sidebar, nav with `aria-current` and the animated bar, ProjectSwitcher, theme toggle, profile menu + logout), SkipLink, MobileTopBar + hamburger (≤ 760 px), OfflineBanner (`onlineManager`), PageHeader.
ProjectsPage (grid, local search, stretched-link tiles, empty/no-match), ProjectFormDialog (key preview, 409 → key field), delete with confirmation.
- Commit: `feat(projects): app shell and projects CRUD`

### Phase 4 — Backlog + Todo details (BL-1…4, BL-6)
BacklogPage with groups (active → planned → backlog), TodoRow (grid from DESIGN §7), QuickCreate (Enter keeps focus, Esc cancels), FilterBar (URL state + debounce + "Showing X of Y"), TodoDetailsDialog (`?todo=`, all fields, dirty guard + confirm bar, save-error bar with Retry, delete with confirmation).
- Commit: `feat(backlog): backlog list, filters, quick create and todo details`

### Phase 5 — Sprint planning + DnD (BL-5, BL-7, SPR-1…3)
SprintFormDialog (defaults: starts after the last sprint, two weeks), delete planned sprint, StartSprintDialog (disabled with an explanation when one is active), DnD within and between groups, ↑/↓ keyboard moves crossing groups, "Move to top/bottom / Sprint X / Backlog" menu, drag disabled with an explanation while filtering, announcements.
- Tests: `moveInLists()`, rollback when the request fails (MSW 500).
- Commit: `feat(sprints): sprint planning, start sprint and backlog drag and drop`

### Phase 6 — Board + Complete + History (SPR-4…7)
SprintHeader (dates, days left, progress), 4 columns (`role=region` + count), TodoCard, DnD + ←/→/↑/↓, ColumnComposer, "No active sprint" empty state, CompleteSprintDialog (radio cards), SprintsPage (380 px list + detail, stacked below 864 px), StatTiles, todo list.
- Commit: `feat(board): active sprint board, complete sprint and sprints history`

### Phase 7 — AI (AI-1…5)
`useAiStatus` (once, `staleTime: Infinity`) → Mock badge. AssistantDrawer (side Radix Dialog; chat in `stores/assistant.ts`, keyed by `projectId`; Enter/Shift+Enter; thinking dots; Markdown without raw HTML; quick prompts; Copy). GenerateTodosDialog (editable drafts, select all, bulk save, skeleton, AI error panel). PlanSprintDialog (capacity bar, over capacity, editable goal, `todoIds` matched against the backlog cache). SprintSummaryCard (saved + Regenerate + generated time). "Generate AI summary" option in Complete. Disclaimer on every AI surface. 429/502 → message + Try again.
- Commit: `feat(ai): assistant drawer, generate todos, plan sprint and summaries`

### Phase 8 — Polish + quality
- 404 for every cause (route / project / todo), `RouteErrorBoundary` + `AppErrorBoundary`.
- `document.title` per page, motion stagger, responsive at 1440/1024/768/390 (board columns 85vw + scroll-snap on mobile, TouchSensor 200 ms).
- Keyboard shortcuts (`c`, `/`, `?`, `g b`) — optional.
- Playwright e2e for the full demo flow (register → project → AI todos → AI plan → start → move → complete → summary).
- Lighthouse a11y ≥ 95 in both themes, no axe errors.
- `client/README.md`: setup, decisions and why, AC table (✅/⚠️), enhancements, deviations from the design (§2), known issues.
- One commit per item.

### Phase 9 — CI (you run it)
`.github/workflows/client.yml`: `npm ci` → `lint` → `typecheck` → `test` → `build`, plus a separate e2e job that starts the server in mock mode after `npm run seed`.

---

## 7. What the reviewer will notice ("senior" standards)

- No `any`; `as` only at boundaries (JSON); types derived from `api.ts` only.
- No fetch in components; all data access through hooks in `hooks/`.
- No server data in `useState`, context or Zustand.
- No hex colors in components (lint rule: `no-restricted-syntax` or stylelint `color-no-hex` outside `tokens.css`).
- Logical CSS properties only (`margin-inline`, `inset-inline-end`).
- Every icon-only button has an `aria-label` (enforced by its type), `:focus-visible` everywhere, reduced motion respected.
- Every mutation gives feedback; every view has loading/empty/error.
- Small Conventional Commits.
- The README explains **why**, not just **what**.

---

## 8. Git workflow

- **No direct commits to `main`.** One branch per phase (`feat/client-setup`, `feat/auth`, `feat/projects`…), then a PR into `main`, so the reviewer sees a clean, reviewable history.
- Inside a branch: small Conventional Commits (the Requirements ask for "small meaningful commits", at least one per day).
- Before each commit: `npm run lint && npm run typecheck && npm run test && npm run build`.
- Claude never runs `git add/commit/push`, opens PRs or runs CI; it gives the commands.

---

## 9. Cross-cutting details

### 9.1 Runtime environment
- **CORS:** the server only allows `CLIENT_ORIGIN=http://localhost:5173`. Any other port breaks every request: `vite preview` (4173), Vite falling back to 5174, or Playwright. **Fix without touching the server:** a Vite proxy for `/api` (same origin, so no CORS at all) + `strictPort: true`.
- `client/.env` is not committed (ignored by `.gitignore` ✔); `.env.example` is the reference.

### 9.2 Data correctness and concurrency
- **Racing moves:** two quick drags = two parallel requests; the second can land first and corrupt the order. Fix: `useMutation({ scope: { id: 'move-' + projectId } })` in TanStack v5 so moves run in sequence, and invalidate only when `isMutating({ mutationKey: ['move'] }) === 1`.
- **Optimistic quick create (BL-2):** the row appears immediately with a temporary id, so several todos can be typed in a row without waiting.
- **429:** auth (50 per 15 min) and AI (20 per min): no automatic retry on 4xx, show the server message. Built into the QueryClient `retry`.
- **Multiple tabs:** real-time sync is out of scope, but listening to the `storage` event on the token key is cheap: logging out in one tab logs out the others.

### 9.3 Navigation and errors
- **Unsaved changes on navigation:** the Todo dialog guard covers Esc/close only; add React Router `useBlocker` for in-app navigation and `beforeunload` for closing the tab.
- **Chunk load failure** after a new deploy (`lazy()` throws): `RouteErrorBoundary` detects it and shows "A new version is available · Reload".
- **404 HTTP status:** an SPA can't return a real 404 (DESIGN §9 asks for one); we render the page and note this in the README.
- React Router `ScrollRestoration`, and focus moved to `<main>` or the `h1` on route change (screen readers don't otherwise notice the page changed).
- `/sprints` without a `sprintId` opens the most recent sprint (DESIGN §6b).

### 9.4 Design features assigned to phases
- New project: "Generate a starter backlog with AI" (generate-todos, then bulk after creating) — phase 7.
- Todo details: "AI suggestion area" = an "Improve this todo" button via the chat — phase 7.
- 404: "Ask AI to find it" opens the drawer with the path — phase 8.
- Backlog: "Complete sprint" link on the active sprint group, and "Drag todos here to plan Sprint X" on an empty group — phase 5.
- Starting an empty sprint is blocked with a toast (DESIGN §9.04) — phase 5.
- Register: welcome toast. Projects: `kbAdded` highlight on the new project.

### 9.5 Security
- Markdown: AI links open with `target="_blank" rel="noopener noreferrer"`; the default `urlTransform` blocks `javascript:`.
- React Query Devtools are loaded lazily in `import.meta.env.DEV` only (not in the production bundle, never exposing the token).

### 9.6 Quality and delivery
- a11y in unit tests: `vitest-axe` on dialogs and key pages.
- dnd-kit `dropAnimation` disabled under `prefers-reduced-motion`.
- Storybook (DESIGN §15 checklist): optional, after the AC are done.
- **Demo (deliverable 3):** a short video of register → project → AI todos → AI plan → start → move → complete → summary, recorded on fresh `npm run seed` data, in both themes.
- `<meta name="theme-color">` per theme and `<meta name="description">`.

---

## 10. Decisions (2026-11-03)

| # | Topic | Decision | Why |
|---|---|---|---|
| 1 | Forgot password | **Frontend only, no endpoint**: `/forgot-password` with an email form (validated on blur and submit) → "Sending…" button (simulated ~800 ms delay) → "Check your email" state (email icon, address in bold, Resend with a cooldown, "Back to log in"). A note "Demo only — password reset isn't available in this version" in `--text-subtlest`. Documented in `client/README.md` | The Requirements forbid backend changes and put password reset out of scope; §9 allows faking features on the frontend if documented |
| 2 | Deletes | **Confirm dialog** for projects and todos. After confirming, the item disappears immediately (optimistic) and comes back with an error toast if the request fails. **Undo toast** for **moves** only ("KAN-12 moved to Sprint 3 · Undo") | BL-4 and PRJ-4 require confirmation, and the AC are what's tested (40%). Project deletion cascades on the server and can't really be undone |
| 3 | Primitives | **Radix UI**: `react-dialog` (Dialog and the AI drawer), `react-alert-dialog` (Confirm and Session expired), `react-dropdown-menu` (⋯ menus, switcher, profile). Everything else (Button, Field, native Select…) is our own | Focus trap, restore, Esc, roving focus and `aria-*` are well tested, tree-shakable (~10–15 KB gz for all three), and unstyled so the design tokens apply 1:1. Hand-rolling = a11y risk for no gain |
| 4 | Tests and CI | **All three:** (a) Vitest + Testing Library + MSW for the API layer, guards, stores, pure functions (`moveInLists`) and key components, written in every phase. (b) Playwright: one e2e scenario for the full demo flow + `@axe-core/playwright` checks on main pages in both themes, in phase 8. (c) GitHub Actions: `lint` → `typecheck` → `test` → `build`, plus a separate e2e job running the server in mock mode after `npm run seed`, in phase 9 | Listed in Requirements §9 enhancements and raises the code-quality score. You run and push them yourself |

**Basis for decision 1:** the Requirements forbid backend changes in the first table ("Do not change it; treat it as the contract"), §7 Out of scope ("password reset", "any backend change") and §9 ("fine to fake on the frontend… as long as you explain it").
