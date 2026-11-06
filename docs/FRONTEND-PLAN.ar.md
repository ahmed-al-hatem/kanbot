# Kanbot — خطة بناء الـ Frontend (AR)

> مرجع العمل لبناء `client/`. يجمع بين ثلاثة مصادر:
> [REQUIREMENTS](REQUIREMENTS.en.md) (ما سيُختبر) · [IMPLEMENTATION-PLAN](IMPLEMENTATION-PLAN.en.md) (العقد مع الـ API) · **التصميم: [Kanbot design canvas](https://claude.ai/code/artifact/efe99d87-baac-4bb7-96e1-235363299397)** + مواصفاته المكتوبة [DESIGN.md](../design/DESIGN.md).
>
> **قاعدة الأولوية عند التعارض:** عقد الـ API (`server/src/types/api.ts` + zod schemas) ← ثم الـ Requirements (معايير القبول AC) ← ثم التصميم.
> الـ backend ممنوع تعديله، والتقييم يختبر الـ AC (40%)، لذلك أي شيء في التصميم لا يدعمه الـ API نعدّله أو نؤجله ونوثّقه في README.
>
> النسخة الإنجليزية: [FRONTEND-PLAN.en.md](FRONTEND-PLAN.en.md).

---

## 0. مصدر التصميم

**المرجع البصري والسلوكي:** https://claude.ai/code/artifact/efe99d87-baac-4bb7-96e1-235363299397

- الـ canvas فيه **56 artboard** (54 شاشة/حالة + `H00 Handoff spec` + `H01 User flow`)، بالثيمين light و dark وبعرض 1440 (desktop) و 390 (mobile).
- كل الـ artboards تعرض **prototype واحداً تفاعلياً** هو `project/Main.dc.html`، وكل artboard يمرّر له ثلاثة props فقط: `screen` و `mode` (`light` | `dark`) و `variant` (الحالة). أي: عند تنفيذ شاشة نراجع `Main.dc.html` بالـ `screen` المناسب، وليس ملفات الـ artboards الصغيرة.
- `H00 Handoff spec` = نفس محتوى [DESIGN.md](../design/DESIGN.md) (tokens، components، motion، keyboard، states). **DESIGN.md هو النسخة النصية المعتمدة** للقيم؛ الـ canvas هو المرجع للشكل والتفاعل الفعلي.
- `H01 User flow` = نفس مخطط DESIGN.md §6b.
- الوصول للملفات: Claude يقرأها عبر أداة الـ Artifact (`read` بالمسار، مثلاً `project/Main.dc.html`). الـ wireframes في `design/wireframes/` أقدم ورمادية: للمحتوى فقط، والـ canvas يتقدّم عليها.

### 0.1 خريطة الشاشات ← الـ routes ← المراحل

| `screen` في Main.dc.html | Artboards | Route / سطح | المرحلة |
|---|---|---|---|
| `login` | L/D 01، M01 (mobile) | `/login` | 2 |
| `forgot` | S02 | `/forgot-password` (واجهة فقط، §10) | 2 |
| `register` | L/D 02 | `/register` | 2 |
| `projects` · `projects-empty` | L/D 03، 03b | `/projects` | 3 |
| `newProject` | L/D 12 | Dialog فوق Projects | 3 |
| `backlog` | L/D 04، M02 | `/projects/:projectId/backlog` | 4–5 |
| `todo` | L/D 06 | Dialog `?todo=<id>` | 4 |
| `sprintForm` | L/D 13 | Dialog (create / edit / start) | 5 |
| `board` | L/D 05، M03 | `/projects/:projectId/board` | 6 |
| `complete` | L/D 11 | Dialog فوق Board | 6 |
| `sprints` | L/D 10 | `/projects/:projectId/sprints/:sprintId?` | 6 |
| `drawer` | L/D 07 | AI drawer على كل الصفحات | 7 |
| `generate` | L/D 08 | Dialog فوق Backlog | 7 |
| `plan` | L/D 09 | Dialog فوق Backlog | 7 |
| `notfound` | S09، M04 | `*` و 404 للمشروع/todo | 8 |

| `variant` | Artboard | أين يُنفَّذ | المرحلة |
|---|---|---|---|
| `login-error` | S01 | بانر 401 في Login | 2 |
| `session` | S05 | SessionExpiredDialog | 2 |
| `offline` | S06 | OfflineBanner في الـ shell | 3 |
| `loading` | S03 | Skeleton لكل صفحة (بنفس شكلها) | 1 (المكوّن) + كل مرحلة |
| `error` | S04 | PageError لكل صفحة | 1 (المكوّن) + كل مرحلة |
| `save-error` | S08 | شريط الخطأ في Todo details | 4 |
| `ai-error` | S07 | لوحة الخطأ في Generate todos (والـ AI عموماً) | 7 |

**قاعدة العمل في كل مرحلة:** قبل تنفيذ شاشة نراجع الـ `screen` والـ `variant` الخاصة بها في الـ canvas بالثيمين (والـ mobile إن وُجد)، ثم نقارن النتيجة بها قبل الـ commit.

---

## 1. الوضع الحالي لـ `client/`

**`client/` غير موجود؛ نبدأ من الصفر.** (حُذفت نسخة سابقة غير مكتملة وغير موثّقة في 2026-11-03.)

نقاط يجب أن تغطيها طبقة الـ API الجديدة من البداية:
- `ApiError` بـ `status`, `code`, `message`, `details` + `fieldErrors(err)` + كود `NETWORK_ERROR` (plan §3.3).
- قراءة/كتابة `localStorage` داخل `try/catch` (تنكسر في بعض أوضاع الخصوصية).
- دعم `AbortSignal` (TanStack Query يمرّر `signal` لإلغاء الطلبات عند تغيّر الصفحة/البحث).
- `index.html` يضع class الثيم قبل أول paint (منع الوميض).

---

## 2. قرارات التعارض بين التصميم والـ API (مهم قبل البدء)

| # | الموضوع | DESIGN.md يقول | الـ API / Requirements | القرار |
|---|---|---|---|---|
| 1 | Priority | high / medium / low | `urgent` / high / medium / low | ندعم الأربعة. `urgent` بأيقونة `priority-highest` ولون `--danger-icon` + نص |
| 2 | Story points | رقم 0–40 | `1,2,3,5,8,13` أو `null` | `<select>` بقيم فيبوناتشي + "None" |
| 3 | Project key | 2–5 `[A-Z0-9]`، غير قابل للتعديل | `^[A-Z]{2,6}$`، قابل للتعديل (PRJ-3) | نتبع الـ API + hint "تغيير المفتاح لا يغيّر مفاتيح الـ todos" |
| 4 | Assignee / Reporter | موجود في الكرت والـ dialog وفلتر الـ backlog | غير موجود (single-user) | **نحذفه** من كل الواجهات والفلاتر |
| 5 | Forgot password | شاشة 01b | لا يوجد endpoint (وخارج النطاق) | **واجهة فقط** مع ملاحظة "Demo only" وتوثيق في README (§10) |
| 6 | الحذف | فوري + Undo toast | PRJ-4 و BL-4: **تأكيد** إلزامي | Project: `ConfirmDialog` يذكر الاسم ويحذّر من حذف الـ todos والـ sprints. Todo: `ConfirmDialog` أيضاً (AC). Undo فقط للـ **move** (§10) |
| 7 | Session expired | Dialog غير قابل للإغلاق | AUTH-6: redirect إلى `/login?redirect=` + رسالة | ندمجهما: الـ Dialog ← "Log in again" ← `/login?redirect=<current>` مع رسالة "Your session has expired…" |
| 8 | الروابط | `/projects/:key/...` و `?todo=KAN-18` | الـ API يعمل بالـ `id` فقط | `/projects/:projectId/...` و `?todo=<todoId>` (deep-link بدون طلب إضافي للبحث عن الـ key) |
| 9 | Start sprint | يبدأ مباشرة | SPR-3: dialog بتاريخ بداية (اليوم) ونهاية (+14) | dialog صغير بنفس ستايل "Create sprint" |
| 10 | Progress | Done فقط | `stats.donePoints` (Done فقط) | Done فقط ✔ |
| 11 | Status في Todo details | معطّل إلا في الـ sprint النشط | الـ API يسمح دائماً | نتبع التصميم (أوضح للمستخدم) |
| 12 | حدود الحقول | title 120، goal 160، description 300 | title 200، goal 300، description 500/5000، name 80 | zod في الواجهة = **حدود الـ API** حتى لا نرفض قيماً صحيحة |
| 13 | Offline | تعديلات تُحفظ في طابور | — | **لا طابور.** الـ mutations تعمل بـ `networkMode: 'always'`: عند انقطاع الشبكة تفشل فوراً بـ `NETWORK_ERROR` وتُظهر واجهة الخطأ المعتادة (شريط خطأ الحفظ مع Retry مع بقاء التعديلات، toast للخطأ، والتراجع عن التحديث المتفائل). الطابور (mutations متوقفة في TanStack) يعيش في الذاكرة فقط ويضيع عند إعادة التحميل، وكان يُبقي مؤشر الحفظ يدور بلا أي رد. الـ queries ما زالت تتوقف وتُعاد عند عودة الاتصال. البانر: "You're offline. Changes can't be saved until you reconnect." + toast "Back online" (قرار 2026-11-04) |
| 14 | React | 18 | `package.json` فيه 19 | React 19 |

---

## 3. الـ Stack والقرارات التقنية (ولماذا)

| المجال | الاختيار | السبب |
|---|---|---|
| Styling | **CSS Modules + `tokens.css` عام** (بدون Tailwind / UI kit) | التصميم مبني بالكامل على CSS variables؛ CSS Modules = صفر runtime، scoping، وتطابق 1:1 مع DESIGN.md. سهل التبرير أمام المقيّم |
| Primitives | **Radix UI**: `react-dialog`, `react-alert-dialog`, `react-dropdown-menu` (+ `react-visually-hidden` اختياري) | focus trap، restore focus، Esc، `aria-*`، roving focus في القوائم — كلها مطلوبة في §10. نكتبها بأنفسنا = خطر أخطاء a11y. Radix unstyled ويدعم exit animation عبر `data-state` |
| Icons | **مكوّن `<Icon name>` خاص + map للـ paths** (الطريقة (b) في DESIGN §5.1) | `@atlaskit/icon` يسحب `@atlaskit/tokens` و emotion → وزن كبير. ننسخ الـ paths مرة واحدة بسكربت من `node_modules` (devDependency) إلى `icons.ts` |
| HTTP client | **`fetch` الأصلي** داخل wrapper واحد `request<T>()` في `api/client.ts` (لا axios) | صفر KB بدل ~14KB gz. الـ interceptors (token، 401) داخل الـ wrapper، والـ retry والإلغاء من TanStack Query (`signal`)، والـ timeout عبر `AbortSignal.any([signal, AbortSignal.timeout(ms)])` (15s عادي، 45s للـ AI). axios لا يضيف شيئاً يحتاجه المشروع (لا upload progress) |
| Server state | TanStack Query v5 | cache، optimistic، retry، online manager |
| Client state | **Zustand** (+ `persist` middleware) | حالة الواجهة فقط (session، theme، toast، announcer، محادثة الـ AI، حالة الـ drawer). subscriptions بـ selectors بدل إعادة render لكل الشجرة كما في Context، ويمكن استدعاؤه خارج React (مثلاً `api/client.ts` عند 401). **ممنوع** وضع بيانات السيرفر فيه (plan §3.4) |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | `mode: 'onTouched'` = validate on blur ثم on change (يطابق §10.5) |
| DnD | `@dnd-kit/core` + `sortable` | keyboard sensor + announcements |
| Markdown | `react-markdown` — **lazy** | بدون `rehype-raw` (NFR-7)، ويُحمَّل فقط عند فتح الـ AI |
| Dates | `Intl.DateTimeFormat` | لا حاجة لـ date-fns |
| Animation | CSS keyframes من DESIGN §8.3 فقط | لا Framer Motion (~40KB). exit animations عبر Radix `data-state=closed` |
| Fonts | `@fontsource-variable/inter` self-hosted + preload؛ و `@fontsource/ibm-plex-sans-arabic` (400/500/600/700) للعربية داخل الـ chunk العربي الكسول (§11) | يلغي اتصال Google Fonts (أسرع LCP، لا FOIT). زائر الإنجليزية لا يحمّل الخط العربي أبداً |
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
├── api/                      # client.ts + auth/projects/todos/sprints/ai.ts — لا fetch خارج هذا المجلد
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
├── i18n/                     # القواميس وتنسيق Intl وتبديل اللغة (§11)
├── lib/                      # dates.ts, cx, constants, useDebouncedValue, useDelayedLoading
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
- إنشاء المشروع ونسخ عقد الـ API (أنت تنفّذ، من جذر `kanbot/`):
  ```bash
  npm create vite@latest client -- --template react-ts
  cd client
  cp ../server/src/types/api.ts src/types/api.ts
  ```
- تثبيت الحزم (أنت تنفّذ):
  ```bash
  npm i react-router @tanstack/react-query @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-markdown
  npm i react-hook-form zod @hookform/resolvers zustand @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-dropdown-menu @fontsource-variable/inter
  npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-plugin-jsx-a11y globals prettier vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw @atlaskit/icon @atlaskit/icon-lab rollup-plugin-visualizer
  ```
- `src/vite-env.d.ts` بأنواع `ImportMetaEnv` (`VITE_API_URL`) — حالياً `import.meta.env.VITE_API_URL` غير مُعرّف النوع.
- `.nvmrc` = `20` و `engines` في `package.json` (مطابق للسيرفر).
- alias `@/` → `src/` في `tsconfig` و `vite.config.ts`.
- Vite proxy: `server.proxy` و `preview.proxy` لـ `/api` → `http://localhost:4000`، و `VITE_API_URL=/api`، و `strictPort: true` (انظر §9.1).
- ESLint 9 + Prettier + `.editorconfig` + سكربتات `lint`, `format`, `test`, `e2e`.
- CI من أول يوم: `.github/workflows/client.yml` (job `verify`: `npm ci` ← `lint` ← `typecheck` ← `test` ← `build`) و `.github/pull_request_template.md`، كما في [SESSION-RUNBOOK.ar.md §هـ](SESSION-RUNBOOK.ar.md).
- Vitest + Testing Library + MSW + `test/setup.ts`.
- `styles/tokens.css` (نسخ §3.2 حرفياً + spacing/radius/easing كـ variables)، `base.css`، `motion.css` (§8.3 + reduced-motion).
- `Icon.tsx` + `icons.ts` (سكربت `scripts/extract-icons.mjs` ينسخ الـ paths من `@atlaskit/icon`) + `TypeIcon` (Task/Story SVG من §5.3) + `Logo`.
- `main.tsx` (QueryClient: `staleTime: 30s`, `retry` ذكي لا يعيد 4xx، `refetchOnWindowFocus` مفعّل)، `router.tsx` بهيكل فارغ.
- `.gitattributes` بـ `* text=auto eol=lf` (يوقف تحذيرات LF/CRLF على Windows).
- `api/client.ts`: `request<T>(method, path, { body, signal, timeoutMs })` — يضيف `Authorization` و `Content-Type`، يعيد `undefined` لـ 204، يرمي `ApiError` لغير 2xx، `NETWORK_ERROR` عند فشل الشبكة، `TIMEOUT` عند انتهاء المهلة (ويتجاهل `AbortError` الناتج عن إلغاء TanStack Query)، ويستدعي `useSession.getState().expire()` عند 401 (إلا `/auth/login`). مع unit tests بـ MSW لكل حالة.
- `api/auth.ts`, `projects.ts`, `todos.ts`, `sprints.ts`, `ai.ts`: دوال typed من `api.ts` تمرّر `signal`. الـ AI بـ `timeoutMs: 45_000`.
- stores الـ Zustand (`session`, `theme`, `toast`, `announcer`) كما في §5.1b. الـ `user` يبقى query `['me']` عبر hook `useCurrentUser()`.
- commit: `chore(client): scaffold vite app with tooling, tokens and icons`
- commit: `feat(client): api layer and zustand ui stores`

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
`useAiStatus` (مرة واحدة، `staleTime: Infinity`) → Mock badge. AssistantDrawer (Radix Dialog جانبي، المحادثة في `stores/assistant.ts` مفهرسة بـ `projectId`، Enter/Shift+Enter، thinking dots، Markdown بدون raw HTML، quick prompts، Copy). GenerateTodosDialog (drafts قابلة للتعديل، select all، bulk save، skeleton، AI error panel). PlanSprintDialog (capacity bar، over-capacity، goal قابل للتعديل، يربط `todoIds` بكاش الـ backlog). SprintSummaryCard (saved + Regenerate + وقت التوليد). خيار "Generate AI summary" في Complete. Disclaimer في كل سطح AI. 429/502 → رسالة + Try again.
- commit: `feat(ai): assistant drawer, generate todos, plan sprint and summaries`

### المرحلة 8 — Polish + جودة
- 404 بكل الحالات (route / project / todo)، `RouteErrorBoundary` + `AppErrorBoundary`.
- `document.title` لكل صفحة، motion stagger، responsive 1440/1024/768/390 (board 85vw + scroll-snap على الموبايل، TouchSensor 200ms).
- اختصارات لوحة مفاتيح (`c`, `/`, `?`, `g b`) — اختياري.
- Playwright e2e للمسار الكامل في الـ demo (register → project → AI todos → AI plan → start → move → complete → summary).
- Lighthouse a11y ≥ 95 في الثيمين، axe بدون أخطاء.
- `client/README.md`: التشغيل، القرارات ولماذا، جدول AC (✅/⚠️)، التحسينات، الانحرافات عن التصميم (§2 هنا)، known issues.
- commit لكل بند على حدة.

### المرحلة 9 — E2E في الـ CI (تنفّذه أنت)
إضافة job `e2e` إلى `.github/workflows/client.yml` (الـ job `verify` موجود منذ المرحلة 0): seed للسيرفر في mock mode ثم Playwright، و `webServer` في `playwright.config.ts` يشغّل السيرفر والواجهة. التفاصيل في [SESSION-RUNBOOK.ar.md §هـ](SESSION-RUNBOOK.ar.md).

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

## 10. القرارات (2026-11-03)

| # | الموضوع | القرار | السبب |
|---|---|---|---|
| 1 | Forgot password | **واجهة فقط، بدون endpoint**: `/forgot-password` بنموذج email (validation عند blur و submit) ← زر "Sending…" (تأخير محاكى ~800ms) ← حالة "Check your email" (أيقونة email، العنوان bold، زر Resend مع cooldown، "Back to log in"). ملاحظة "Demo only — password reset isn't available in this version" بلون `--text-subtlest`. القرار موثّق في `client/README.md` | الـ Requirements تمنع تعديل الـ backend وتضع password reset خارج النطاق، و §9 تسمح بمحاكاة الميزات في الواجهة مع التوثيق |
| 2 | الحذف | **Confirm dialog** للـ project وللـ todo. بعد التأكيد يختفي العنصر فوراً (optimistic) ويعود مع toast خطأ إذا فشل الطلب. الـ **Undo toast** للـ **move** فقط ("KAN-12 moved to Sprint 3 · Undo") | BL-4 و PRJ-4 تشترطان التأكيد، والـ AC هي ما يُختبر (40%). حذف المشروع cascade على السيرفر ولا يمكن التراجع عنه حقيقةً |
| 3 | Primitives | **Radix UI**: `react-dialog` (Dialog والـ AI drawer)، `react-alert-dialog` (Confirm و Session expired)، `react-dropdown-menu` (قوائم ⋯ و switcher و profile). باقي المكوّنات (Button و Field و Select الأصلي…) نكتبها بأنفسنا | focus trap و restore و Esc و roving focus و `aria-*` مختبرة جيداً، و tree-shakable (~10–15KB gz للثلاثة)، و unstyled فنطبق tokens التصميم 1:1. كتابتها يدوياً = خطر a11y بلا فائدة |
| 4 | الاختبارات و CI | **نعم، الثلاثة**: (أ) Vitest + Testing Library + MSW لطبقة الـ API والـ guards والـ stores والدوال النقية (`moveInLists`) والمكوّنات الأساسية، تُكتب مع كل مرحلة. (ب) Playwright: سيناريو e2e واحد للمسار الكامل في الـ demo + فحص `@axe-core/playwright` على الصفحات الرئيسية في الثيمين، في المرحلة 8. (ج) GitHub Actions: `lint` ← `typecheck` ← `test` ← `build`، و job e2e منفصل يشغّل السيرفر في mock mode بعد `npm run seed`، في المرحلة 9 | مذكورة في تحسينات الـ Requirements §9، وترفع تقييم Code quality. أنت تشغّلها وترفعها بنفسك |

**مرجع القرار 1:** الـ Requirements تمنع تعديل الـ backend في الجدول الأول ("Do not change it; treat it as the contract")، و §7 Out of scope ("password reset" و "any backend change")، و §9 ("fine to fake on the frontend… as long as you explain it").

---

## 11. RTL والعربية (i18n)

التصميم العربي: [الـ canvas العربي](https://claude.ai/code/artifact/75890d4c-d82e-4f3b-bb09-8d085c7a6877) — الملف `project/MainAr.dc.html` (تعرضه artboards الـ `AR-*`). المصطلحات: [I18N-GLOSSARY.md](I18N-GLOSSARY.md).

### 11.1 القرارات (2026-11-06)

| # | الموضوع | القرار | لماذا |
|---|---|---|---|
| 1 | المكتبة | **قواميس TypeScript مُنمَّطة + `Intl` الأصلي** (`DateTimeFormat` و `NumberFormat` و `PluralRules`). بلا مكتبة i18n | لغتان فقط؛ الخطأ في مفتاح أو ترجمة ناقصة يصبح خطأ type؛ 0 KB؛ الجمع والتواريخ من المنصة نفسها |
| 2 | اللغة الافتراضية والحفظ | الزائر الجديد **يبدأ دائماً بالإنجليزية**. الاختيار يُحفظ (`kanbot.locale`) ولا يتغيّر الـ URL | لا مفاجأة للمقيّم أو للروابط المشاركة؛ لا بادئة لغة في كل route |
| 3 | الخط | العربية تستخدم **IBM Plex Sans Arabic وحده** للنص العربي واللاتيني معاً؛ الإنجليزية تبقى على Inter | ارتفاع حرف واحد في الأسطر المختلطة (المفاتيح والأسماء والأرقام داخل الجمل العربية) |
| 4 | التسليم | **خمسة PRs خلف `VITE_FEATURE_AR`**: R1 الأساس · R2 الدخول + الإطار + المشاريع · R3 الـ backlog + تفاصيل البند + السبرنتات · R4 اللوحة + السجل + الذكاء الاصطناعي + 404 + الأخطاء · R5 مراجعة RTL البصرية + التفعيل. الـ flag مفعّل على Vercel Preview فقط؛ الإنتاج يبقى إنجليزياً حتى R5 | كل PR صغير وقابل للمراجعة؛ الإنتاج لا يعرض تطبيقاً نصف مترجَم |

### 11.2 الهيكل

```
src/
├── features.ts               # isArabicEnabled() — القارئ الوحيد لـ VITE_FEATURE_AR
├── i18n/
│   ├── index.ts              # الواجهة العامة: useT و useLocale و setLocale و useFormat و useDirection و getT و initLocale
│   ├── config.ts             # LOCALES، الاتجاه لكل لغة، وسوم Intl (en → en-US، ar → ar-SY-u-nu-latn)، مفتاح التخزين
│   ├── plural.ts             # Intl.PluralRules؛ العربية zero/one/two/few/many/other
│   ├── format.ts             # التواريخ والفترات والوقت النسبي والأرقام — Formatter لكل لغة
│   ├── errors.ts             # كود ApiError و details[].path → رسالة (هيكل أولي في R1)
│   ├── parity.ts             # فحص تطابق شكل en/ar وقت التشغيل (الاختبارات + dev)
│   ├── useSwitchLocale.ts    # مشترك بين مبدّلَي اللغة (حالة التحميل، toast الخطأ)
│   └── messages/
│       ├── en.ts             # المصدر؛ النوع `Messages` مشتق منه
│       ├── ar.ts             # `satisfies Messages`؛ chunk كسول مع IBM Plex Sans Arabic
│       └── languages.ts      # أسماء اللغات بلغاتها (English، العربية، EN، ع) — دائماً في الحزمة
├── stores/locale.ts          # Zustand + persist: اللغة؛ يُبقي <html lang dir> متزامناً
└── lib/dates.ts              # حساب التواريخ (نُقل من lib/format.ts، بلا لغة)
```

- الوصول `t.section.key` / `t.section.fn(n)`، لا مفاتيح نصية أبداً. صيغ الجمع دوال تستخدم `plural()`.
- `ar.ts` يُحمَّل بـ `import()` ديناميكي: زائر الإنجليزية لا يحمّله ولا يحمّل الخط. الاختيار العربي المحفوظ يُحمَّل **قبل أول render** (`initLocale()` في `main.tsx`)، وسكربت `index.html` يضبط `lang`/`dir` من التخزين قبل الرسم، فلا وميض LTR.
- مع إطفاء الـ flag يعمل التطبيق بالإنجليزية دائماً أياً كان المحفوظ، ولا يظهر أي مبدّل.
- تمديدات الاتجاه: `DirectionProvider` من Radix، والمتغيّر `--dir` (1 / −1) للـ transforms، والصنف `.flip` للأيقونات الاتجاهية (`kb-flip` في الـ canvas)، و `useDirection()`. التخطيط يستخدم الخصائص المنطقية أصلاً (§7).
- الفترات يومان منسّقان تجمعهما رسالة اللغة ("Oct 20 – Nov 2")، لا `Intl.DateTimeFormat#formatRange`: ICU يختصر فترات الشهر الواحد ("Oct 20 – 25") ويضيف السنة عند رأس السنة ويستخدم مسافات رفيعة، فيتغيّر الناتج الإنجليزي.
- المبدّلان (حسب الـ canvas العربي): **ع / EN** مقسّم بجانب زر الثيم في صفحات الدخول، وعنصر **English · اللغة** أسفل الشريط الجانبي. التبديل يُبقي الشاشة الحالية.

### 11.3 القواعد (CLAUDE.md، للمناطق المنقولة)

- لا نص يراه المستخدم (ومنه `aria-label` و `title` و `placeholder` والـ toasts وإعلانات الـ live region و `document.title`) خارج `i18n/messages`.
- كل تاريخ ورقم عبر `i18n/format` (`useFormat()`)؛ لا `toLocaleString` ولا تواريخ مركّبة يدوياً.
- لا فحص `locale === 'ar'` داخل المكوّنات: الفروق في القواميس و `format.ts` والـ CSS (`[dir='rtl']` و `[lang='ar']`).
- قاعدة ESLint `react/jsx-no-literals` (النصوص والخصائص) **error** في المجلدات المنقولة، المدرجة في `eslint.config.js` (`I18N_MIGRATED`)، وتكبر القائمة مع كل PR؛ R5 يجعلها عامة.

### 11.4 الـ PRs الخمسة

| PR | النطاق | يكتمل عندما |
|---|---|---|
| R1 | الأساس: `i18n/` و store اللغة والـ flag والمبدّلان وتمديدات الاتجاه والخط العربي والطباعة والمسرد وقاعدة lint | الناتج الإنجليزي مطابق؛ مع الـ flag يعمل التبديل ويُحفظ؛ اختبارات التطابق والجمع والأشهر والتنسيقات والـ store والمبدّلَين |
| R2 | الدخول (login و register و forgot و session expired)، الإطار (الشريط الجانبي والمبدّل والملف الشخصي وشريط الجوال وشريط عدم الاتصال والاختصارات)، المشاريع | تلك المجلدات في `I18N_MIGRATED` واختباراتها تنجح باللغتين |
| R3 | الـ backlog وتفاصيل البند ونماذج السبرنت (إنشاء / بدء / حذف) وإعلانات السحب والإفلات | كذلك |
| R4 | اللوحة وإكمال السبرنت وسجل السبرنتات ودرج الذكاء الاصطناعي ونوافذه و404 وحدود الأخطاء والـ toasts و `document.title` في كل مكان | كذلك؛ و `lib/format.ts` لم يعد مستخدماً |
| R5 | مراجعة RTL البصرية مقابل artboards الـ `AR-*` (الشريط الجانبي يميناً، الدرج يساراً، الـ toast أسفل اليمين، عكس الـ keyframes والأسهم، اتجاهات لوحة المفاتيح في dnd-kit، مقاسات العربية 15px و 11 → 12px)، e2e و axe بالعربية، `jsx-no-literals` عامة، حذف `lib/format.ts`، تفعيل الـ flag في الإنتاج | التطبيق كله يجتاز مراجعة الـ canvas العربي في الثيمين وعلى 390px |
