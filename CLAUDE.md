# Kanbot — instructions for Claude Code

Kanbot is a sprint board with an AI assistant. `server/` is a finished Express API; `client/` is the React app being built phase by phase.

## Read before any work
- `docs/FRONTEND-PLAN.en.md` — the plan: phases (§6), decisions (§2, §10), state rules (§5), standards (§7).
- `docs/REQUIREMENTS.en.md` — acceptance criteria by ID (AUTH-1, BL-3…). The reviewer tests these.
- `design/DESIGN.md` — tokens, components, motion, keyboard, states.
- Design canvas: https://claude.ai/code/artifact/efe99d87-baac-4bb7-96e1-235363299397 — every artboard renders `project/Main.dc.html` with `screen`, `mode` and `variant` props. Read it with the Artifact tool for the screens of the current phase.
- `server/src/types/api.ts` — the API contract. `client/src/types/api.ts` is a copy; never edit it by hand.

Priority on conflict: API contract → Requirements AC → design.

## Hard rules
- Never modify `server/`.
- Never run `git add/commit/push`, open PRs, trigger GitHub Actions, or run tests, lint, typecheck, build or CI. Finish each task by giving the exact commands; the user runs them and pastes back any failures.
- Work only on the phase named in the prompt. Don't start the next one.
- Server data lives only in TanStack Query. Zustand holds UI state only (`client/src/stores/`).
- No `fetch` outside `client/src/api/`; components use hooks from `client/src/hooks/`.
- No hex colors outside `client/src/styles/tokens.css`; use `var(--token)`. Logical CSS properties only.
- No `any` without a comment explaining why. Every icon-only button has an `aria-label`.
- Every view has loading, empty and error states; every mutation gives feedback.

## End of every phase
1. Update `client/README.md`: the "Progress" table (requirement IDs → ✅ / ⚠️ with a note), "Decisions" for anything new, "Known issues".
2. List each acceptance criterion of the phase and whether it is met.
3. Give the verification commands, then the git commands split into small Conventional Commits, then the PR title and body.
