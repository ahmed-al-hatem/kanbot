# Kanbot — دليل تشغيل الجلسات (مرحلة لكل session)

> كل مرحلة من [FRONTEND-PLAN.en.md §6](FRONTEND-PLAN.en.md) تُنفَّذ في **session جديدة** من Claude Code، على **فرع خاص بها**، وتنتهي بـ **PR** يمر عليه CI ثم merge.
> القواعد الدائمة (لا git، لا تعديل للسيرفر، مصادر القراءة…) موجودة في [`CLAUDE.md`](../CLAUDE.md) في جذر المشروع، ويقرؤها Claude تلقائياً في كل session، فلا داعي لتكرارها في كل prompt.

---

## أ. إعداد لمرة واحدة

1. **دمج فرع التوثيق** (الخطة + `CLAUDE.md` + هذا الدليل) في `main` عبر PR، ثم:
   ```bash
   git checkout main
   git pull
   ```
2. **GitHub CLI** (لفتح الـ PRs من الطرفية):
   ```bash
   gh auth login
   ```
3. **تشغيل السيرفر** في تبويب طرفية مستقل يبقى مفتوحاً طوال العمل:
   ```bash
   cd server
   npm install
   cp .env.example .env
   npm run seed
   npm run dev
   ```
   الحساب التجريبي: `demo@kanbot.dev` / `password123`. أعد `npm run seed` متى أردت بيانات نظيفة.
4. **حماية `main`** (بعد المرحلة 0، عندما يصبح الـ CI موجوداً): GitHub ← Settings ← Branches ← Add rule لـ `main`:
   - Require a pull request before merging.
   - Require status checks to pass ← اختر `client / verify`.
   - لا تفعّل "Require linear history": يمنع الـ merge commits التي نستخدمها في §ب-8.

---

## ب. الدورة الثابتة لكل مرحلة

| # | الخطوة | من ينفّذ |
|---|---|---|
| 1 | تحديث `main` وإنشاء فرع المرحلة | أنت |
| 2 | التأكد أن السيرفر يعمل (`http://localhost:4000/api/health`) | أنت |
| 3 | فتح **session جديدة** ولصق الـ prompt | أنت |
| 4 | التنفيذ + تحديث `client/README.md` + إعطاؤك الأوامر | Claude |
| 5 | تشغيل أوامر التحقق، ولصق أي خطأ في نفس الـ session حتى تنظف | أنت ↔ Claude |
| 6 | فحص يدوي في المتصفح بالثيمين ومقارنة بالـ canvas | أنت (Claude يساعد) |
| 7 | `git add` / `commit` / `push` | أنت |
| 8 | فتح PR، انتظار CI، merge | أنت |
| 9 | العودة إلى `main` وحذف الفرع المحلي | أنت |
| 10 | إغلاق الـ session والبدء بجديدة للمرحلة التالية | أنت |

### 1) فرع المرحلة
```bash
git checkout main
git pull
git checkout -b <branch>
```
(`<branch>` من جدول §ج.)

### 3) الـ session الجديدة
- **في تطبيق Claude Desktop:** ابدأ **New session** من الشريط الجانبي على مجلد `D:\FreelancersHub\kanbot` (أفضل من `/clear` لأن كل مرحلة تبقى لها محادثة مستقلة يمكنك الرجوع إليها).
- **في الطرفية (CLI):** `/clear` ثم الصق الـ prompt.
- لا تكمل مرحلتين في نفس الـ session: السياق يطول، والجودة تنخفض، والمراجعة تصعب.

### الـ prompt (القالب)
انسخه واملأ الأقواس من جدول §ج:

```text
Phase <N> — <name>.

Read CLAUDE.md, then docs/FRONTEND-PLAN.en.md (all of it, focus on §6 Phase <N>),
the requirement IDs below in docs/REQUIREMENTS.en.md, and design/DESIGN.md <sections>.
Open the design canvas and study project/Main.dc.html for
screens: <screens> · variants: <variants> · both themes (and mobile if listed).

Implement Phase <N> only, exactly as the plan describes.
Requirements in scope: <IDs>.
<extra notes for this phase>

When you finish:
1. Update client/README.md (Progress, Decisions, Known issues).
2. List every acceptance criterion in scope with ✅ / ⚠️ and why.
3. Give me the verification commands (lint, typecheck, test, build) — I run them and paste failures back.
4. Give me git add / commit commands as small Conventional Commits (I'm already on branch <branch>), then git push, then the gh pr create command with a title and a body that uses .github/pull_request_template.md.
Do not run git, tests or CI yourself.
```

### 5) أوامر التحقق (من داخل `client/`)
```bash
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```
إذا فشل شيء: الصق المخرجات كما هي في نفس الـ session واطلب "fix these". لا تنتقل للـ commit قبل أن تنظف الأربعة.

### 6) الفحص اليدوي
```bash
npm run dev
```
افتح `http://localhost:5173`، جرّب كل AC في نطاق المرحلة (قائمة QA في [IMPLEMENTATION-PLAN.en.md §6](IMPLEMENTATION-PLAN.en.md#6-qa-checklist-run-before-delivering))، بدّل الثيم، صغّر النافذة إلى 768 و 390، وجرّب بالكيبورد فقط. قارن بالـ artboards في الـ canvas.

### 7) add / commit / push
Claude يعطيك الأوامر الفعلية مقسّمة. الشكل العام:
```bash
git add client/<paths>
git commit -m "<type>(<scope>): <summary>"
git push -u origin <branch>
```
- `git add` بمسارات محددة، **لا** `git add .` (حتى لا يدخل `.env` أو ملفات عرضية).
- راجع قبل الـ commit:
  ```bash
  git status
  git diff --staged
  ```

### 8) الـ PR والـ CI
```bash
gh pr create --base main --title "<title>" --body-file <file>
gh pr checks --watch
```
عندما يصبح `client / verify` أخضر:
```bash
gh pr merge --merge --delete-branch
```
(`--merge` يحفظ الـ commits الصغيرة في التاريخ، وهو ما تطلبه الـ Requirements. إن فشل CI: الصق السجل من `gh run view --log-failed` في نفس الـ session.)

### 9) التنظيف
```bash
git checkout main
git pull
git branch -d <branch>
```

### 10) إغلاق الـ session
أرشِف الـ session من الشريط الجانبي (أو `/clear` في الـ CLI). كل ما تحتاجه المرحلة التالية موجود في الملفات: `CLAUDE.md` والخطة و `client/README.md`.

---

## ج. جدول المراحل

| # | الاسم | الفرع | Requirements | الشاشات · variants | DESIGN.md | ما تفعله أنت قبل الـ prompt |
|---|---|---|---|---|---|---|
| 0 | Tooling & foundations | `feat/client-setup` | NFR-1, NFR-7, NFR-8 | — | §3, §4, §5, §8 | الأوامر في §د-0 |
| 1 | Design system | `feat/ui-components` | NFR-5 | كل الشاشات كمرجع للمكوّنات | §7, §10.3 | — |
| 2 | Auth | `feat/auth` | AUTH-1…6 | `login`, `register`, `forgot` · `login-error`, `session` · M01 | §9 (01, 01b, 02), §10.5 | — |
| 3 | Shell + Projects | `feat/projects` | PRJ-1…5 | `projects`, `projects-empty`, `newProject` · `offline` | §6, §9 (03, 12), §13 | — |
| 4 | Backlog + Todo details | `feat/backlog` | BL-1…4, BL-6 | `backlog`, `todo` · `save-error`, `loading`, `error` · M02 | §7 (row, fields), §9 (04, 06) | — |
| 5 | Sprint planning + DnD | `feat/sprint-planning` | BL-5, BL-7, SPR-1…3 | `backlog`, `sprintForm` | §7 (group), §9 (04, 13), §10.1 | — |
| 6 | Board + Complete + History | `feat/board` | SPR-4…7 | `board`, `complete`, `sprints` · `loading`, `error` · M03 | §7 (card, column, stat), §9 (05, 10, 11) | — |
| 7 | AI | `feat/ai` | AI-1…5 | `drawer`, `generate`, `plan` · `ai-error` | §7 (AI drawer), §9 (07, 08, 09) | اختياري: مفتاح AI حقيقي في `server/.env` لاختبار أخير |
| 8 | Polish + quality | `feat/polish` | NFR-2…6, NFR-9 | `notfound` · M04 · كل الشاشات بالثيمين | §8, §11, §13, §15 | — |
| 9 | E2E in CI | `ci/e2e` | — | — | — | `npx playwright install` |

**ملاحظات إضافية للـ prompt (`<extra notes>`):**
- **0:** `The project is already scaffolded and packages are installed (see docs/SESSION-RUNBOOK.ar.md §د-0). Also create .github/workflows/client.yml and .github/pull_request_template.md exactly as in docs/SESSION-RUNBOOK.ar.md §هـ.`
- **2:** `Forgot password is frontend only (plan §10 decision 1).`
- **4:** `Delete uses a confirm dialog (plan §10 decision 2).`
- **5:** `Moves must be serialized with a mutation scope (plan §9.2).`
- **7:** `Chat lives in stores/assistant.ts keyed by projectId. Lazy-load react-markdown.`
- **8:** `Add Playwright with one e2e test for the demo flow and axe checks (plan §10 decision 4). Write the final client/README.md.`
- **9:** `Add the e2e job to .github/workflows/client.yml as in docs/SESSION-RUNBOOK.ar.md §هـ.`

---

## د. خطوات خاصة

### د-0) قبل session المرحلة 0 (من جذر `kanbot/`)
```bash
git checkout main
git pull
git checkout -b feat/client-setup
npm create vite@latest client -- --template react-ts
cd client
mkdir src/types
cp ../server/src/types/api.ts src/types/api.ts
npm i react-router @tanstack/react-query @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-markdown
npm i react-hook-form zod @hookform/resolvers zustand @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-dropdown-menu @fontsource-variable/inter
npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-plugin-jsx-a11y globals prettier vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw vitest-axe @atlaskit/icon @atlaskit/icon-lab rollup-plugin-visualizer
```
إذا سأل `npm create vite` أسئلة: Framework = React، Variant = TypeScript.

### د-7) اختبار الـ AI الحقيقي (اختياري، نهاية المرحلة 7)
في `server/.env` ضع `AI_API_KEY` و `AI_BASE_URL` و `AI_MODEL` (أمثلة في `.env.example`)، أعد تشغيل السيرفر، وتأكد أن `GET /api/ai/status` يعيد `"mode": "ai"`. جرّب أيضاً اسم موديل خاطئ لرؤية حالة 502. أرجعه إلى mock قبل التسليم.

### د-8) الـ demo (deliverable 3)
`npm run seed` ← سجّل الشاشة للمسار: register ← create project ← generate todos with AI ← plan sprint with AI ← start sprint ← move cards ← complete sprint ← AI summary. مرة بالثيم الفاتح على الأقل، و 2–4 دقائق. ضع الرابط في `client/README.md`.

### د-9) Playwright محلياً
```bash
cd client
npx playwright install --with-deps chromium
npm run e2e
```

---

## هـ. GitHub Actions و قالب الـ PR

### `.github/workflows/client.yml` (يُنشأ في المرحلة 0)
```yaml
name: client

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: client-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: client/.nvmrc
          cache: npm
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --run
      - run: npm run build
```
- بدون `paths` filter عن قصد: لو كان الـ check مطلوباً في حماية `main` وفُلتر، فـ PRs التوثيق لن تُدمج أبداً.

### الـ job الإضافي (المرحلة 9)
```yaml
  e2e:
    needs: verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: client/.nvmrc
          cache: npm
          cache-dependency-path: |
            client/package-lock.json
            server/package-lock.json
      - run: npm ci
        working-directory: server
      - run: cp .env.example .env && npm run seed
        working-directory: server
      - run: npm ci
        working-directory: client
      - run: npx playwright install --with-deps chromium
        working-directory: client
      - run: npm run e2e
        working-directory: client
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: client/playwright-report
```
`playwright.config.ts` يشغّل السيرفر (`npm run dev` في `../server`) والواجهة (`npm run build && npm run preview`) عبر `webServer`، فلا حاجة لتشغيلهما يدوياً في الـ CI.

### `.github/pull_request_template.md` (يُنشأ في المرحلة 0)
```markdown
## Phase
<!-- e.g. Phase 2 — Auth -->

## What changed
-

## Requirements
| ID | Status | Notes |
|---|---|---|
|  | ✅ |  |

## Screens checked against the design canvas
- [ ] Light
- [ ] Dark
- [ ] 768px
- [ ] 390px
- [ ] Keyboard only

## Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`

## Notes / follow-ups
```

---

## و. التوثيق في كل مرحلة

| أين | ماذا | متى |
|---|---|---|
| `client/README.md` ← **Progress** | جدول Requirement ID ← ✅ / ⚠️ + ملاحظة | كل مرحلة |
| `client/README.md` ← **Decisions** | أي قرار جديد وسببه (المكتبة، الانحراف عن التصميم…) | عند حدوثه |
| `client/README.md` ← **Known issues** | ما لم يكتمل أو يحتاج متابعة | كل مرحلة |
| وصف الـ PR | من القالب: ما تغيّر، الـ AC، الفحص اليدوي، التحقق | كل PR |
| رسائل الـ commits | Conventional Commits صغيرة | كل commit |
| `docs/FRONTEND-PLAN.*.md` | فقط إذا تغيّر قرار في الخطة (في PR منفصل `docs/...`) | نادراً |

بنية `client/README.md` (تُنشأ في المرحلة 0 وتُكمَّل في 8):
1. Overview + screenshot
2. Getting started (server + client، `.env`، الحساب التجريبي)
3. Scripts
4. Tech stack and why
5. Architecture (المجلدات، الحالة، طبقة الـ API)
6. Design implementation (رابط الـ canvas، tokens، الانحرافات عن التصميم)
7. Progress (جدول الـ Requirements)
8. Decisions
9. Enhancements
10. Testing & CI
11. Known issues
12. Demo
