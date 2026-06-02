# Finish the project — Claude Code master prompt

Copy everything inside the fenced block below into Claude Code (`claude --dangerously-skip-permissions` from `screenpipe-x-jot/`).

---

```markdown
# FINISH — Jot × Screenpipe unified product (Phases 2–4)

You are the build orchestrator. Phases **0 and 1 are DONE**. Your job is to complete Phases **2 → 3 → 4** in order and ship a dogfood-ready app. Do not stop at stubs. Do not re-implement Phase 1 unless `cargo test -p screenpipe-recall` fails.

## Start here (read first)

1. `PRD.md` — product goals G1–G6
2. `docs/claude-code/CLAUDE_PROGRESS.md` — what's already built
3. `docs/claude-code/BUILD.md` — build/run/smoke test
4. `docs/claude-code/AUTONOMOUS.md` — never ask me to approve routine cargo/npm edits
5. `engine/docs/engine/reference/{POLICY,API,ACCEPTANCE}.md`

## Locked decisions (do not re-litigate)

- Policy lives in Rust (`screenpipe-recall`); Jot only calls HTTP/SSE
- Dual DB v1 (Jot notes SQLite + Screenpipe SQLite); federate note candidates in retrieval
- Product shell = **Jot** (Electron); user never needs Screenpipe Tauri for daily use after Phase 3
- No LLM on proactive hot path; default **Silence**
- No `git reset`; no force-push to main

## Already working (do not break)

- `engine/target/release/screenpipe` — build with `./scripts/build-engine.sh`
- `/recall/status`, `/recall/evaluate`, `/recall/action`, `/recall/stream` (SSE)
- `integration/engineManager.js` spawns `screenpipe record`; `integration/recallClient.js`
- Jot: Engine menu, ⌘⇧R manual recall dry-run, 40/40 npm tests
- `cargo test -p screenpipe-recall` — 21/21 pass

Auth: `SCREENPIPE_API_KEY` (not only LOCAL). Child process must receive it.

## Execute phases in strict order

For each phase file, complete **all exit criteria**, run **verification commands**, update `docs/claude-code/CLAUDE_PROGRESS.md`, then proceed.

| Phase | File | Goal |
|-------|------|------|
| 2 | `docs/claude-code/03-phase-2-jot-resurfacing.md` | Policy-driven overlay; kill "3 notes on every switch" |
| 3 | `docs/claude-code/04-phase-3-memory-ux.md` | Search / Rewind / Ask in Jot; bundle engine in dmg |
| 4 | `docs/claude-code/05-phase-4-polish-ship.md` | Meeting/focus, defer, debug panel, manual-qa.md |

Also run adapted checks from `engine/docs/engine/prompts/09-controls-and-modes.md` and `10-tests-docs-and-ship.md` inside Phase 4.

## Phase 2 — critical implementation notes

- On app switch (not Jot's own bundle): **300ms debounce** → `recallClient.evaluate({ trigger: 'app_switch', dryRun: false })`
- Prefer **SSE** `subscribeStream()` for `recall.surface` events; polling evaluate is fallback only
- **Surface** → show **one** overlay card (not 3): snippet + **why-now** chips from API response
- Actions → `POST /recall/action` (dismiss / snooze / never_app)
- Gate legacy path: `surface.pickSurfacedNotes` off unless `JOT_LEGACY_SURFACE=true`
- Add `jot/tests/` for debounce + mock recallClient Surface/Silence paths
- Create/update `docs/claude-code/manual-qa.md`

## Phase 3 — critical implementation notes

- Search panel: `/memories`, `/search`, `/activity-summary` per `engine/.claude/skills/screenpipe-api/SKILL.md` (auth header, `start_time` required)
- Ask: blend Jot note search + Screenpipe results with source badges
- Tray: recording state from engine health
- `electron-builder` `extraResources`: ship `screenpipe` binary from `engine/target/release/`
- Minimal unified onboarding doc (permissions: Screen Recording, Accessibility, Automation)

## Phase 4 — critical implementation notes

- Meeting/focus suppression in Rust + Jot settings toggle
- Defer recheck behavior tested or documented in manual-qa
- Dev debug: last decision + `/recall/status` in Jot menu
- `docs/claude-code/perf-notes.md` + update workspace README
- Verify `engine/docs/engine/reference/ACCEPTANCE.md` (Tauri card → Jot overlay satisfies "card appears on Surface")

## Repo ownership

| Path | Use for |
|------|---------|
| `engine/` | Rust recall, engine routes only if needed |
| `jot/` | Electron UI, overlay, IPC, panels |
| `integration/` | Sidecar, API client, shared types |
| `docs/claude-code/` | Progress + QA docs |

## Verification before declaring DONE

```bash
./scripts/build-engine.sh
cd engine && cargo test -p screenpipe-recall
cd . && npm test
export SCREENPIPE_API_KEY=dev-key-123
# engine running:
curl -s -H "Authorization: Bearer $SCREENPIPE_API_KEY" http://127.0.0.1:3030/recall/status
```

Human-only (document in manual-qa, do not block on): macOS TCC grants, notarization credentials.

## If context runs out

1. Finish current phase; update `CLAUDE_PROGRESS.md` with `current_phase` and files changed
2. Tell me: re-paste this prompt with "Continue from phase N"

## Final output (only when phases 2–4 exit criteria pass)

Print:
- Phases completed
- PRD goals G1–G6: met / partial
- How to run: `./scripts/build-engine.sh`, `export SCREENPIPE_API_KEY=...`, `cd . && npm start`
- Tests run (commands + results)
- ACCEPTANCE.md checklist
- Known limitations

Begin now with `docs/claude-code/03-phase-2-jot-resurfacing.md`.
```
