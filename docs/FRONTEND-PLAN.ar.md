# Kanbot — خطة بناء الـ Frontend (AR)

> مرجع العمل لبناء `client/`. يجمع بين ثلاثة مصادر:
> [REQUIREMENTS](REQUIREMENTS.en.md) (ما سيُختبر) · [IMPLEMENTATION-PLAN](IMPLEMENTATION-PLAN.en.md) (العقد مع الـ API) · [DESIGN.md](../design/DESIGN.md) + الـ prototype `Main.dc.html` (الشكل والسلوك).
>
> **قاعدة الأولوية عند التعارض:** عقد الـ API (`server/src/types/api.ts` + zod schemas) ← ثم الـ Requirements (معايير القبول AC) ← ثم DESIGN.md.
> الـ backend ممنوع تعديله، والتقييم يختبر الـ AC (40%)، لذلك أي شيء في التصميم لا يدعمه الـ API نعدّله أو نؤجله ونوثّقه في README.

---

## 1. الوضع الحالي لـ `client/`

| موجود ✅ | ملاحظات |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig.json` (strict), `index.html` (سكربت الثيم قبل أول paint ✔) | لا يوجد ESLint/Prettier/Vitest، ولا سكربت `lint` (مطلوب في NFR-1) |
| `src/types/api.ts` | مطابق تماماً لنسخة السيرفر ✔ |
| `src/api/client.ts` + `src/api/index.ts` | طبقة API جيدة: `ApiError`، `fieldErrors`، معالجة 401، `NETWORK_ERROR` |
| `src/app/auth.tsx`, `theme.tsx`, `toast.tsx`, `announcer.tsx` | Providers أساسية جاهزة |
| `src/lib/format.ts` | تنسيق التواريخ، labels، ألوان المشاريع |

| ناقص ❌ | الأثر |
|---|---|
| `src/main.tsx`, `router.tsx` | التطبيق لا يعمل أصلاً |
| `src/components/Icon.tsx` | `toast.tsx` يستورده → **الـ build مكسور حالياً** |
| `src/styles/*` (tokens, reset, keyframes) | لا يوجد أي CSS |
| `src/hooks/*`، كل الـ features، كل الـ components | — |
| `client/README.md` | من الـ deliverables |

ملاحظات صغيرة على الكود الموجود (نصلحها في المرحلة 0):
- `api/client.ts`: قراءة/كتابة `localStorage` بدون `try/catch` (تنكسر في بعض أوضاع الخصوصية).
- `api/client.ts`: يفضّل دعم `AbortSignal` (TanStack Query يمرّر `signal` لإلغاء الطلبات عند تغيّر الصفحة/البحث).
- `announcer.tsx`: `setTimeout` بدون تنظيف.

---

## 2. قرارات التعارض بين التصميم والـ API (مهم قبل البدء)

| # | الموضوع | DESIGN.md يقول | الـ API / Requirements | القرار |
|---|---|---|---|---|
| 1 | Priority | high / medium / low | `urgent` / high / medium / low | ندعم الأربعة. `urgent` بأيقونة `priority-highest` ولون `--danger-icon` + نص |
| 2 | Story points | رقم 0–40 | `1,2,3,5,8,13` أو `null` | `<select>` بقيم فيبوناتشي + "None" |
| 3 | Project key | 2–5 `[A-Z0-9]`، غير قابل للتعديل | `^[A-Z]{2,6}$`، قابل للتعديل (PRJ-3) | نتبع الـ API + hint "تغيير المفتاح لا يغيّر مفاتيح الـ todos" |
| 4 | Assignee / Reporter | موجود في الكرت والـ dialog وفلتر الـ backlog | غير موجود (single-user) | **نحذفه** من كل الواجهات والفلاتر |
| 5 | Forgot password | شاشة 01b | لا يوجد endpoint (وخارج النطاق) | إما نحذفها، أو نبنيها UI-only مع توضيح في README. **التوصية: UI-only** (تُظهر جودة التصميم بدون كذب وظيفي، مع ملاحظة واضحة) |
| 6 | الحذف | فوري + Undo toast | PRJ-4 و BL-4: **تأكيد** إلزامي | Project: `ConfirmDialog` يذكر الاسم ويحذّر من حذف الـ todos والـ sprints. Todo: `ConfirmDialog` أيضاً (AC). Undo نضيفه كتحسين فقط للـ **move** |
| 7 | Session expired | Dialog غير قابل للإغلاق | AUTH-6: redirect إلى `/login?redirect=` + رسالة | ندمجهما: الـ Dialog ← "Log in again" ← `/login?redirect=<current>` مع رسالة "Your session has expired…" |
| 8 | الروابط | `/projects/:key/...` و `?todo=KAN-18` | الـ API يعمل بالـ `id` فقط | `/projects/:projectId/...` و `?todo=<todoId>` (deep-link بدون طلب إضافي للبحث عن الـ key) |
| 9 | Start sprint | يبدأ مباشرة | SPR-3: dialog بتاريخ بداية (اليوم) ونهاية (+14) | dialog صغير بنفس ستايل "Create sprint" |
| 10 | Progress | Done فقط | `stats.donePoints` (Done فقط) | Done فقط ✔ |
| 11 | Status في Todo details | معطّل إلا في الـ sprint النشط | الـ API يسمح دائماً | نتبع التصميم (أوضح للمستخدم) |
| 12 | حدود الحقول | title 120، goal 160، description 300 | title 200، goal 300، description 500/5000، name 80 | zod في الواجهة = **حدود الـ API** حتى لا نرفض قيماً صحيحة |
| 13 | Offline | تعديلات تُحفظ في طابور | — | TanStack Query يوقف الـ mutations تلقائياً offline (`networkMode: 'online'`) ويستأنفها؛ نضيف البانر + toast عند العودة. لا نبني طابوراً يدوياً |
| 14 | React | 18 | `package.json` فيه 19 | React 19 |

---

## 3. الـ Stack والقرارات التقنية (ولماذا)

| المجال | الاختيار | السبب |
|---|---|---|
| Styling | **CSS Modules + `tokens.css` عام** (بدون Tailwind / UI kit) | التصميم مبني بالكامل على CSS variables؛ CSS Modules = صفر runtime، scoping، وتطابق 1:1 مع DESIGN.md. سهل التبرير أمام المقيّم |
| Primitives | **Radix UI**: `react-dialog`, `react-alert-dialog`, `react-dropdown-menu` (+ `react-visually-hidden` اختياري) | focus trap، restore focus، Esc، `aria-*`، roving focus في القوائم — كلها مطلوبة في §10. نكتبها بأنفسنا = خطر أخطاء a11y. Radix unstyled ويدعم exit animation عبر `data-state` |
| Icons | **مكوّن `<Icon name>` خاص + map للـ paths** (الطريقة (b) في DESIGN §5.1) | `@atlaskit/icon` يسحب `@atlaskit/tokens` و emotion → وزن كبير. ننسخ الـ paths مرة واحدة بسكربت من `node_modules` (devDependency) إلى `icons.ts` |
| Server state | TanStack Query v5 (موجود) | cache، optimistic، retry، online manager |
| Client state | **Zustand** (+ `persist` middleware) | حالة الواجهة فقط (session، theme، toast، announcer، محادثة الـ AI، حالة الـ drawer). subscriptions بـ selectors بدل إعادة render لكل الشجرة كما في Context، ويمكن استدعاؤه خارج React (مثلاً `api/client.ts` عند 401). **ممنوع** وضع بيانات السيرفر فيه (plan §3.4) |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | `mode: 'onTouched'` = validate on blur ثم on change (يطابق §10.5) |
| DnD | `@dnd-kit/core` + `sortable` (موجود) | keyboard sensor + announcements |
| Markdown | `react-markdown` (موجود) — **lazy** | بدون `rehype-raw` (NFR-7)، ويُحمَّل فقط عند فتح الـ AI |
| Dates | `Intl.DateTimeFormat` (موجود في `format.ts`) | لا حاجة لـ date-fns |
| Animation | CSS keyframes من DESIGN §8.3 فقط | لا Framer Motion (~40KB). exit animations عبر Radix `data-state=closed` |
| Fonts | `@fontsource-variable/inter` self-hosted + preload | يلغي اتصال Google Fonts (أسرع LCP، لا FOIT). IBM Plex Arabic نتركه عبر Google Fonts بـ `unicode-range` (لا يُحمّل إلا عند وجود عربي) أو نحذفه لأن المشروع English only |
| Lint/Format | ESLint 9 flat: `typescript-eslint` (type-checked) + `react-hooks` + `react-refresh` + `jsx-a11y` · Prettier | NFR-1 |
| Tests | Vitest + Testing Library + `@testing-library/user-event` + **MSW** · Playwright للـ e2e | من قائمة التحسينات، ويرفع تقييم الكود |
| اختياري | `babel-plugin-react-compiler` | memoization تلقائي بدل `useMemo/useCallback` يدوي |

---

## 4. هيكل المجلدات المستهدف

```
client/src/
├── main.tsx                  # createRoot + <Providers><RouterProvider/></Providers>
├── router.tsx                # createBrowserRouter + lazy routes
├── app/                      # QueryClientProvider + RouterProvider + الـ hosts (Toaster, LiveRegion, SessionExpiredDialog)
├── stores/                   # Zustand: session.ts, theme.ts, toast.ts, announcer.ts, assistant.ts
├── api/                      # client.ts + index.ts (موجود) — لا fetch خارج هذا المجلد
├── hooks/                    # queries/mutations: useProjects, useBacklog, useBoard, useMoveTodo...
│   └── queryKeys.ts          # مصنع مفاتيح موحّد: qk.project(id), qk.todos(pid, filters)...
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
├── lib/                      # format.ts, cx, constants, useDebouncedValue, useDelayedLoading
├── styles/                   # tokens.css, base.css (reset + typography + focus), motion.css (keyframes)
└── test/                     # setup.ts, msw handlers, render helpers
```

قاعدة: كل feature يصدّر صفحاته فقط؛ الـ components المشتركة في `components/`، ولا تستورد feature من feature أخرى إلا عبر `todos/` (مشترك بين backlog و board).

---

## 5. معمارية الحالة والأداء

### 5.1 Query keys والـ invalidation
```ts
qk = {
  me: ['me'],
  projects: ['projects'],
  project: (id) => ['project', id],
  todos: (pid, f?) => ['todos', pid, f ?? {}],   // backlog + كل sprint (sprintId في الفلتر)
  sprints: (pid) => ['sprints', pid],
  sprint: (id) => ['sprint', id],
  board: (id) => ['board', id],
  aiStatus: ['ai-status'],
}
```
| Mutation | Invalidate |
|---|---|
| create/update/delete todo | `todos(pid)` (prefix)، `project(pid)`، و `board(sid)` إن كان في sprint |
| move todo | optimistic على القائمة المعنية → onSettled: نفس أعلاه + `sprints(pid)` (الإحصاءات) |
| create/update/delete sprint | `sprints(pid)`، `todos(pid)` |
| start / complete sprint | `sprints(pid)`، `board(sid)`، `todos(pid)`، `project(pid)`، `projects` |
| project CRUD | `projects`، `project(id)` |

### 5.1b توزيع الحالة: من يملك ماذا

| الحالة | المالك | ملاحظات |
|---|---|---|
| بيانات السيرفر (projects, todos, sprints, board, user `me`, ai-status) | TanStack Query | المصدر الوحيد. لا نسخ في Zustand |
| `token`، `sessionExpired` | `stores/session.ts` (Zustand + `persist` للـ token فقط) | `api/client.ts` يقرأ `useSession.getState().token` ويستدعي `expire()` عند 401 مباشرة، فيختفي `setUnauthorizedHandler`. `signOut()` يمسح الـ token ثم `queryClient.clear()` |
| الثيم | `stores/theme.ts` (`persist` بمفتاح `kanbot.theme`) | سكربت `index.html` يبقى لتجنّب الوميض؛ الـ store يقرأ الـ class الموجود كقيمة أولية |
| Toast (واحد في كل مرة) | `stores/toast.ts` | `toast.show()` قابل للاستدعاء من `onError` في الـ mutations بدون hook |
| Live announcements | `stores/announcer.ts` | `announce('KAN-21 moved to In Progress…')` من handlers الـ DnD |
| محادثة الـ AI + فتح/إغلاق الـ drawer | `stores/assistant.ts` | الرسائل مفهرسة بـ `projectId` (`Record<projectId, Message[]>`)، فتبديل المشروع يعطي محادثة جديدة تلقائياً؛ `persist` اختياري كتحسين ("Save chat history per project") |
| الفلاتر والبحث، `?todo=` | URL search params | قابلة للمشاركة وتنجو من الـ reload — لا Zustand |
| حالة الـ forms والـ dialogs المحلية | `react-hook-form` / `useState` | محلية للمكوّن |

قواعد Zustand في المشروع:
- store صغير لكل مجال، مع actions داخل الـ store، وexport لـ hooks بـ selectors: `const token = useSession((s) => s.token)`؛ لا `useSession()` بدون selector.
- `useShallow` عند اختيار أكثر من قيمة.
- كل store يصدّر دالة `reset` تُستدعى في `signOut()` (مسح المحادثات والـ toast).
- tests: نستدعي `useX.setState(initial)` في `beforeEach`.

### 5.2 منع الـ waterfalls (NFR-6)
- **Board:** `project.stats.activeSprint.id` يأتي من `GET /projects/:id` الذي نحتاجه أصلاً للـ shell → نطلب `board(activeSprintId)` مباشرة، بدون انتظار `sprints`.
- **Backlog:** `sprints(pid)` و `todos(pid,{sprintId:'backlog'})` بالتوازي. todos كل sprint planned تُطلب بالتوازي عبر `useQueries`، أو — **أفضل** — طلب واحد `GET /projects/:id/todos` (بدون فلتر) ثم تقسيمه client-side بـ `select` حسب `sprintId`. **التوصية: طلب واحد** (أقل round-trips، وتحديث optimistic في مكان واحد).
- **Prefetch:** عند hover/focus على روابط الـ sidebar وبطاقات المشاريع → `queryClient.prefetchQuery` + `import()` للـ chunk.
- **Route loaders:** اختياري — React Router loaders تستدعي `ensureQueryData` فيبدأ الـ fetch بالتوازي مع تحميل الـ chunk.

### 5.3 Code splitting
- كل صفحة `lazy()` على مستوى الـ route.
- `AssistantDrawer` و `GenerateTodosDialog` و `PlanSprintDialog` و `Markdown` lazy (react-markdown + remark ≈ 40–50KB gz).
- `@dnd-kit` يذهب تلقائياً مع chunks الـ backlog/board فقط.
- هدف: initial JS < ~120KB gz. نقيس بـ `rollup-plugin-visualizer`.

### 5.4 Render performance
- `TodoCard` / `TodoRow` داخل `memo` (أو React Compiler)، والـ props ثابتة (id بدل objects مشتقة جديدة).
- البحث: `useDeferredValue` + debounce 300ms، والقيمة في الـ URL (`?q=&priority=&type=`) لـ shareable state.
- `placeholderData: keepPreviousData` للبحث حتى لا تومض القائمة.
- Skeleton: يظهر بعد 150ms ويبقى ≥300ms (hook `useDelayedLoading`) — §11.
- لا virtualization (القوائم صغيرة)؛ نذكر ذلك كقرار مقصود في README.

### 5.5 Optimistic DnD (BL-5, SPR-5)
`onMutate`: `cancelQueries` → snapshot → نقل العنصر في الـ cache (remove من المصدر، insert عند `position`) → `onError`: restore + toast "Couldn't move KAN-12" → `onSettled`: invalidate.
`position` = الفهرس في القائمة الهدف **بعد** إزالة العنصر المسحوب (راجع plan §3.5). منطق النقل دالة نقية `moveInLists()` في `lib/` مع unit tests.

---

## 6. خطة التنفيذ (مراحل = commits/PRs صغيرة)

كل مرحلة تنتهي بتطبيق يعمل + `npm run lint && npm run typecheck && npm run build` نظيفة.

### المرحلة 0 — Tooling والأساسات
- تثبيت الحزم الناقصة من `package.json` (أنت تنفّذ):
  ```bash
  npm i react-hook-form zod @hookform/resolvers zustand @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-dropdown-menu @fontsource-variable/inter
  npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-plugin-jsx-a11y globals prettier vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw @atlaskit/icon @atlaskit/icon-lab rollup-plugin-visualizer
  ```
- `src/vite-env.d.ts` بأنواع `ImportMetaEnv` (`VITE_API_URL`) — حالياً `import.meta.env.VITE_API_URL` غير مُعرّف النوع.
- `.nvmrc` = `20` و `engines` في `package.json` (مطابق للسيرفر).
- alias `@/` → `src/` في `tsconfig` و `vite.config.ts`.
- Vite proxy: `server.proxy` و `preview.proxy` لـ `/api` → `http://localhost:4000`، و `VITE_API_URL=/api`، و `strictPort: true` (انظر §9.1).
- ESLint 9 + Prettier + `.editorconfig` + سكربتات `lint`, `format`, `test`, `e2e`.
- Vitest + Testing Library + MSW + `test/setup.ts`.
- `styles/tokens.css` (نسخ §3.2 حرفياً + spacing/radius/easing كـ variables)، `base.css`، `motion.css` (§8.3 + reduced-motion).
- `Icon.tsx` + `icons.ts` (سكربت `scripts/extract-icons.mjs` ينسخ الـ paths من `@atlaskit/icon`) + `TypeIcon` (Task/Story SVG من §5.3) + `Logo`.
- `main.tsx` (QueryClient: `staleTime: 30s`, `retry` ذكي لا يعيد 4xx، `refetchOnWindowFocus` مفعّل)، `router.tsx` بهيكل فارغ.
- إصلاح ملاحظات §1.
- `npm i zustand`، ونقل `app/auth.tsx` (جزء الـ token/session)، `theme.tsx`، `toast.tsx`، `announcer.tsx` من Context إلى `stores/` (§5.1b). الـ `user` يبقى query `['me']` عبر hook `useCurrentUser()`.
- commit: `chore(client): tooling, design tokens, icons and app bootstrap`
- commit: `refactor(client): move UI state from context to zustand stores`

### المرحلة 1 — Design system components
Button (كل الـ variants + loading يحفظ العرض)، IconButton (aria-label إلزامي في النوع)، Field/Input/Textarea/Select/DateInput/Checkbox/TagInput، Dialog (Radix + أحجام §3.5)، ConfirmDialog، Menu (Radix DropdownMenu)، Lozenge، Chip، PointsPill، Avatar، ProgressBar، StatTile، Skeleton، Spinner، EmptyState، PageError، Banner.
- unit tests: Button loading/disabled، Field يربط `aria-describedby` و `aria-invalid`.
- commit: `feat(ui): design system components`

### المرحلة 2 — Auth (AUTH-1…6)
Login، Register (strength meter)، Forgot (UI-only)، `ProtectedRoute` / `GuestRoute` مع `?redirect=`، full-page loader أثناء `/auth/me`، SessionExpiredDialog، `fieldErrors` → `setError`، focus على أول حقل خاطئ، welcome toast.
- tests: guard redirect، 401 على login يظهر البانر، 409 تحت email.
- commit: `feat(auth): login, register, guards and session expiry`

### المرحلة 3 — Shell + Projects (PRJ-1…5)
AppShell (Sidebar 240، nav مع `aria-current` + الشريط المتحرك، ProjectSwitcher، theme toggle، profile menu + logout)، SkipLink، MobileTopBar + hamburger (≤760)، OfflineBanner (`onlineManager`)، PageHeader.
ProjectsPage (grid، search محلي، tiles بـ stretched link، empty/no-match)، ProjectFormDialog (key preview من `keyFromName`، 409 → حقل key)، حذف بتأكيد.
- commit: `feat(projects): app shell and projects CRUD`

### المرحلة 4 — Backlog + Todo details (BL-1…4, BL-6)
BacklogPage بالمجموعات (active ← planned ← backlog)، TodoRow (grid §7)، QuickCreate (Enter يبقي التركيز، Esc يلغي)، FilterBar (URL state + debounce + "Showing X of Y")، TodoDetailsDialog (`?todo=`، كل الحقول، dirty guard + confirm bar، save-error bar مع Retry، حذف بتأكيد).
- commit: `feat(backlog): backlog list, filters, quick create and todo details`

### المرحلة 5 — Sprints planning + DnD (BL-5, BL-7, SPR-1…3)
SprintFormDialog (defaults: يبدأ بعد آخر sprint، أسبوعان)، حذف planned، StartSprintDialog (معطّل مع شرح إن وُجد active)، DnD بين المجموعات + داخلها، keyboard ↑/↓ مع الانتقال بين المجموعات، menu "Move to top/bottom / Sprint X / Backlog"، تعطيل السحب مع شرح عند وجود فلتر، announcements.
- tests: `moveInLists()`، rollback عند فشل الطلب (MSW 500).
- commit: `feat(sprints): sprint planning, start sprint and backlog drag and drop`

### المرحلة 6 — Board + Complete + History (SPR-4…7)
SprintHeader (dates، days left، progress)، 4 أعمدة (`role=region` + count)، TodoCard، DnD + ←/→/↑/↓، ColumnComposer، empty "No active sprint"، CompleteSprintDialog (radio cards)، SprintsPage (list 380 + detail، stack < 864)، StatTiles، قائمة todos.
- commit: `feat(board): active sprint board, complete sprint and sprints history`

### المرحلة 7 — AI (AI-1…5)
`useAiStatus` (مرة واحدة، `staleTime: Infinity`) → Mock badge. AssistantDrawer (Radix Dialog جانبي، chat state في context على مستوى المشروع يُصفّر عند تغيير `projectId`، Enter/Shift+Enter، thinking dots، Markdown بدون raw HTML، quick prompts، Copy). GenerateTodosDialog (drafts قابلة للتعديل، select all، bulk save، skeleton، AI error panel). PlanSprintDialog (capacity bar، over-capacity، goal قابل للتعديل، يربط `todoIds` بكاش الـ backlog). SprintSummaryCard (saved + Regenerate + وقت التوليد). خيار "Generate AI summary" في Complete. Disclaimer في كل سطح AI. 429/502 → رسالة + Try again.
- commit: `feat(ai): assistant drawer, generate todos, plan sprint and summaries`

### المرحلة 8 — Polish + جودة
- 404 بكل الحالات (route / project / todo)، `RouteErrorBoundary` + `AppErrorBoundary`.
- `document.title` لكل صفحة، motion stagger، responsive 1440/1024/768/390 (board 85vw + scroll-snap على الموبايل، TouchSensor 200ms).
- اختصارات لوحة مفاتيح (`c`, `/`, `?`, `g b`) — اختياري.
- Playwright e2e للمسار الكامل في الـ demo (register → project → AI todos → AI plan → start → move → complete → summary).
- Lighthouse a11y ≥ 95 في الثيمين، axe بدون أخطاء.
- `client/README.md`: التشغيل، القرارات ولماذا، جدول AC (✅/⚠️)، التحسينات، الانحرافات عن التصميم (§2 هنا)، known issues.
- commit لكل بند على حدة.

### المرحلة 9 — CI (اختياري، تنفّذه أنت)
`.github/workflows/client.yml`: `npm ci` → `lint` → `typecheck` → `test` → `build` (+ e2e في job منفصل يشغّل السيرفر في mock mode بعد `npm run seed`).

---

## 7. معايير "Senior" التي سيلاحظها المقيّم

- لا `any`، لا `as` إلا عند الحدود (JSON)، أنواع مشتقة من `api.ts` فقط.
- لا fetch داخل components؛ كل الوصول للبيانات عبر hooks في `hooks/`.
- لا server data في `useState`/context.
- لا hex داخل components (قاعدة lint بسيطة: `no-restricted-syntax` أو stylelint `color-no-hex` خارج `tokens.css`).
- خصائص CSS منطقية فقط (`margin-inline`, `inset-inline-end`).
- كل زر icon-only له `aria-label` (مفروض عبر الـ type)، `:focus-visible` في كل مكان، reduced-motion.
- كل mutation لها feedback، كل view لها loading/empty/error.
- commits صغيرة بأسلوب Conventional Commits.
- README يشرح **لماذا** وليس فقط **ماذا**.

---

## 8b. سير العمل مع git

- **لا commits مباشرة على `main`.** فرع لكل مرحلة: `feat/client-setup`، `feat/auth`، `feat/projects`… ثم PR إلى `main` (المقيّم يرى تاريخاً نظيفاً قابلاً للمراجعة).
- داخل الفرع: commits صغيرة بـ Conventional Commits (الـ Requirements: "Small meaningful commits"، وcommit يومي على الأقل).
- قبل كل commit: `npm run lint && npm run typecheck && npm run test && npm run build`.
- Claude لا ينفّذ `git add/commit/push` ولا يفتح PRs ولا يشغّل CI؛ يعطيك الأوامر فقط.

---

## 9. أشياء فاتت المسودة الأولى

### 9.1 بيئة التشغيل
- **CORS:** السيرفر يسمح فقط بـ `CLIENT_ORIGIN=http://localhost:5173`. أي port آخر يكسر كل الطلبات: `vite preview` (4173)، أو Vite عندما ينتقل تلقائياً إلى 5174، أو Playwright. **الحل بدون لمس السيرفر:** proxy في Vite لـ `/api` (same-origin، فلا CORS أصلاً) + `strictPort: true`.
- `client/.env` غير مرفوع (مُتجاهل في `.gitignore` ✔)؛ `.env.example` هو المرجع.

### 9.2 صحة البيانات والتزامن
- **سباق عمليات النقل:** سحبتان سريعتان متتاليتان = طلبان متوازيان، وقد يصل الثاني قبل الأول فيُفسد الترتيب. الحل: `useMutation({ scope: { id: 'move-' + projectId } })` في TanStack v5 ليُنفَّذ النقل بالتسلسل، و invalidate فقط عندما `isMutating({ mutationKey: ['move'] }) === 1`.
- **Quick create متفائل (BL-2):** الصف يظهر فوراً بـ id مؤقت، فيمكن كتابة عدة todos بسرعة بدون انتظار.
- **429:** للـ auth (50 كل 15 دقيقة) والـ AI (20 في الدقيقة): لا retry تلقائي على 4xx، ونعرض رسالة السيرفر. مُدرج في `retry` الخاص بالـ QueryClient.
- **تبويبات متعددة:** خارج النطاق (real-time sync)، لكن الاستماع لحدث `storage` على مفتاح الـ token رخيص: logout في تبويب يُخرج الآخر.

### 9.3 التنقل والأخطاء
- **Unsaved changes عند التنقل:** حارس Todo dialog يغطي Esc/close فقط؛ نضيف `useBlocker` من React Router للتنقل داخل التطبيق و `beforeunload` لإغلاق التبويب.
- **فشل تحميل chunk** بعد نشر نسخة جديدة (`lazy()` يرمي خطأ): `RouteErrorBoundary` يكتشفه ويعرض "A new version is available · Reload".
- **404 HTTP status:** في SPA لا يمكن إرجاع 404 حقيقي (DESIGN §9 يطلبه)؛ نعرض الصفحة ونذكر ذلك في README.
- `ScrollRestoration` من React Router، وإرجاع التركيز إلى `<main>` أو `h1` عند تغيير الصفحة (قارئات الشاشة لا تعرف أن الصفحة تغيّرت).
- `/sprints` بدون `sprintId` يفتح أحدث sprint (DESIGN §6b).

### 9.4 ميزات في التصميم لم تدخل المراحل
- New project: خيار "Generate a starter backlog with AI" (generate-todos ثم bulk بعد الإنشاء) — المرحلة 7.
- Todo details: "AI suggestion area" = زر "Improve this todo" عبر الـ chat — المرحلة 7.
- 404: زر "Ask AI to find it" يفتح الـ drawer مع المسار — المرحلة 8.
- Backlog: رابط "Complete sprint" في مجموعة الـ active sprint، ونص "Drag todos here to plan Sprint X" للمجموعة الفارغة — المرحلة 5.
- Start sprint على sprint فارغ: ممنوع مع toast (DESIGN §9.04) — المرحلة 5.
- Register: welcome toast؛ Projects: `kbAdded` للمشروع الجديد.

### 9.5 الأمان
- Markdown: روابط الـ AI تُفتح بـ `target="_blank" rel="noopener noreferrer"`، و `urlTransform` الافتراضي يمنع `javascript:`.
- React Query Devtools تُحمَّل lazy في `import.meta.env.DEV` فقط (لا تدخل الـ production bundle، ولا تعرض الـ token).

### 9.6 الجودة والتسليم
- a11y في الـ unit tests: `vitest-axe` على الـ dialogs والصفحات الأساسية.
- dnd-kit: `dropAnimation` تُعطَّل تحت `prefers-reduced-motion`.
- Storybook (من checklist التصميم §15): اختياري، مؤجل لما بعد الـ AC.
- **الـ demo (deliverable 3):** فيديو قصير للمسار: register → project → AI todos → AI plan → start → move → complete → summary. نسجّله على بيانات `npm run seed` نظيفة، في الثيمين.
- `<meta name="theme-color">` لكل ثيم و `<meta name="description">`.

---

## 10. أسئلة مفتوحة تحتاج قرارك

1. Forgot password: UI-only (موصى به) أم حذفها؟
2. حذف الـ todo: Confirm (يطابق AC، موصى به) أم Undo toast كما في التصميم؟
3. Radix UI مقبول كـ dependency، أم تريد primitives مكتوبة يدوياً بالكامل؟
4. هل نضيف Playwright + CI ضمن النطاق أم نكتفي بـ Vitest؟
