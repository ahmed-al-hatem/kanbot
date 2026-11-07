# Kanbot — instructions for Claude Code

Kanbot is a sprint board with an AI assistant. `server/` is a finished Express API (the contract); `client/` is the React app. **All phases of `docs/FRONTEND-PLAN.en.md` are done** and both apps are deployed, so work is now fixes, polish and documentation on a finished product.

## Read before any work
- `docs/REQUIREMENTS.en.md` — acceptance criteria by ID (AUTH-1, BL-3…) and how the project is graded (§8.1). The reviewer tests these.
- `client/README.md` — the state of the app: Progress (§7), Decisions (§8), Enhancements (§9), Known issues (§11), Deployment (§12). Check it before changing behaviour.
- `docs/FRONTEND-PLAN.en.md` — decisions (§2, §10), state rules (§5), standards (§7), i18n (§11).
- `design/DESIGN.md` — tokens, components, motion, keyboard, states. Design canvas: https://claude.ai/code/artifact/efe99d87-baac-4bb7-96e1-235363299397 (`project/Main.dc.html`, props `screen`, `mode`, `variant`); read it with the Artifact tool.
- Arabic / RTL: `docs/I18N-GLOSSARY.md` and the Arabic canvas https://claude.ai/code/artifact/75890d4c-d82e-4f3b-bb09-8d085c7a6877 (`project/MainAr.dc.html`).
- `server/src/types/api.ts` — the API contract. `client/src/types/api.ts` is a copy; never edit it by hand.

Priority on conflict: API contract → Requirements AC → design. A behaviour the AC doesn't ask for (an extra rule, a blocked action) must be listed in README §8 Decisions with its reason.

## Deployment (pushing to `main` deploys)
- **Client → Vercel** (`https://kanbot-ai.vercel.app`), root `client/`, builds only when `client/` changes. `client/vercel.json` proxies `/api/*` to Render. `VITE_*` flags are build-time: changing one needs a redeploy.
- **API → Render** free tier (`https://kanbot-api.onrender.com/api`), root `server/`, builds only on `server/**`. No persistent disk: data resets to the seed on every deploy or restart; the demo account `demo@kanbot.dev` / `password123` always exists.
- So a docs-only change outside `client/` deploys nothing; any `client/` change ships to production once merged. Mention this in the PR body when it matters.

## Hard rules
- Never modify `server/`.
- Never run `git add/commit/push`, open PRs, trigger GitHub Actions, or run tests, lint, typecheck, build or CI. Creating a local branch for the work is fine. Finish each task by giving the exact commands; the user runs them and pastes back any failures.
- Do only the task asked for; propose anything else instead of doing it.
- Server data lives only in TanStack Query. Zustand holds UI state only (`client/src/stores/`).
- No `fetch` outside `client/src/api/`; components use hooks from `client/src/hooks/`.
- No hex colors outside `client/src/styles/tokens.css`; use `var(--token)`. Logical CSS properties only (enforced by `scripts/check-css.mjs`).
- No `any` without a comment explaining why. Every icon-only button has an `aria-label`.
- Every view has loading, empty and error states; every mutation gives feedback.
- `client/README.md` is Prettier-formatted; keep it that way (`npx prettier --write README.md` from `client/` is allowed — it only formats).

## Language and i18n
The requirements ask for an **English** UI (Requirements §1, NFR-9): English is the default and every AC is met and tested in English. Arabic / RTL is an **optional enhancement** (Requirements §9) behind `VITE_FEATURE_AR`; never let it change English behaviour, and describe it as an enhancement in docs.

Rules for all of `client/src/` except tests, `src/test/` and `src/dev/` (enforced by `react/jsx-no-literals`):
- No user-visible text outside `client/src/i18n/messages/` — including `aria-label`, `title`, `placeholder`, toasts, live-region announcements and `document.title`. Read it as `t.section.key` / `t.section.fn(n)` from `useT()` (or `getT()` outside React); never string keys. Add every new string to both `en.ts` and `ar.ts`.
- Arabic terms come from `docs/I18N-GLOSSARY.md`; add a new term there first. Plurals use `plural()` (all six Arabic forms), never `n === 1`.
- All dates and numbers go through `client/src/i18n/format.ts` (`useFormat()`); no `toLocaleString`, no hand-built date strings.
- No `locale === 'ar'` (or `dir === 'rtl'`) checks in components: put the difference in the dictionaries, `format.ts` or CSS (`[dir='rtl']`, `[lang='ar']`, `var(--dir)`, `.flip`).
- `VITE_FEATURE_AR` is read only through `isArabicEnabled()` in `client/src/features.ts`.

## End of every task
1. Update `client/README.md` when behaviour or status changed: §7 Progress (ID → ✅ / ⚠️ with a note), §8 Decisions, §11 Known issues.
2. List each acceptance criterion the change touches and whether it is still met.
3. Give the verification commands (from `client/`: `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, and `npm run e2e` when flows changed), then the git commands split into small Conventional Commits on a branch, then the PR title and body (the PR targets `main`).
