# Claude Code — complete PakrAI

Copy everything below the line into Claude Code from workspace root `screenpipe-x-jot/`.

---

You are the **build orchestrator for PakrAI**. Your only product spec is **`docs/pakrai/`**. Ship **working code**, not stubs. Use multiple sessions if needed.

## Permissions

- Do **not** ask the human to approve routine `cargo`, `npm`, `bun`, `curl`, or file edits under `jot/`, `integration/`, `proactive-recall/`.
- Ask the human **only** for macOS TCC (Screen Recording, Automation, Accessibility) when testing GUI flows.
- **Never** `git reset` or force-push `main`. Commit only if the human asks.

## Step 0 — Read (mandatory, in order)

1. `docs/pakrai/SCOPE.md`
2. `docs/pakrai/VISION.md`
3. `docs/pakrai/QUERY-RECORDINGS.md`
4. `docs/pakrai/REQUIREMENTS.md`
5. `docs/pakrai/ARCHITECTURE.md`
6. `docs/pakrai/CONSTRAINTS.md`
7. `docs/pakrai/PHASES.md`
8. `docs/pakrai/RESURFACING.md`
9. `docs/pakrai/NOTES-AND-SEARCH.md`
10. `docs/pakrai/PAKR-AGENT.md`
11. `docs/pakrai/GAP-MAP.md`
12. `docs/pakrai/PAKRAI_PROGRESS.md` — update after every phase

## What you are building

**PakrAI** — local macOS app (`jot/` Electron shell):

| Verb | Feature |
|------|---------|
| **Capture** | Notes while working (⌘N, library, folders) |
| **Find** | Note search (⌘P) |
| **Query** | Search/ask **screen recordings** (Screenpipe engine, user-initiated) |
| **Resurface** | Notes by **time** (NL schedule) or **context** (app switch; notes-first overlay) |
| **Reorganize** | **Pakr** agent — chat to reorganize notes (LLM, user-initiated, confirm destructive ops) |

**In scope:** screen recording + query via `integration/` + `proactive-recall/` engine (`:3030`).

**Out of scope v1:** microphone, camera, cloud sync, LLM on **app-switch proactive overlay**.

## Locked decisions (do not re-litigate)

- **Notes are the hero**; recording supports **Query**, not the reverse.
- **Proactive overlay:** ≤1 card; notes-first candidates; **no LLM** on app-switch hot path.
- **Query recordings:** user opens panel; search = FTS/deterministic; Ask may use LLM optionally.
- **Pakr agent:** notes DB only — not a replacement for Recordings Ask.
- **Keep engine** auto-start; Screen Recording in onboarding; bundle engine in release dmg (P5).
- **P0:** rebrand to PakrAI — **do not** remove Rewind/Ask; **rebrand** them in P6.

## Step 1 — Verify workspace

```bash
cd screenpipe-x-jot
test -f jot/package.json && test -f proactive-recall/Cargo.toml && test -d integration
./scripts/build-engine.sh    # if proactive-recall/target/release/screenpipe missing
cd jot && npm test
./scripts/verify-stack.sh
```

If engine build fails, read `docs/claude-code/dev-setup.md` and fix before coding.

## Step 2 — Execute phases in order

Open `docs/pakrai/PHASES.md`. Run **every phase** until exit criteria pass:

| Phase | Focus |
|-------|--------|
| **P0** | PakrAI branding; keep recording + engine; health indicator |
| **P6** | Query recordings UX (rebrand Rewind/Ask → Recordings search/ask; offline states; citations) |
| **P1** | Time resurfacing (`resurface_at`, parser, scheduler) — `RESURFACING.md` |
| **P2** | Pakr agent panel + tools on notes DB — `PAKR-AGENT.md` |
| **P3** | Activity tags / context rules (notes-first overlay) |
| **P4** | Note search polish (ranking, recents, pinned) |
| **P5** | Ship: PakrAI Application Support path, engine in dmg, QA doc |

**Per phase:**

1. Read the phase section + linked spec files completely.
2. Implement all tasks; meet **exit criteria**.
3. Run verification commands; fix failures before proceeding.
4. Update `docs/pakrai/PAKRAI_PROGRESS.md` (checklist, files touched, commands, blockers).
5. Only then start the next phase.

P6 may overlap P0 after branding strings land.

## Step 3 — Verification (every phase)

```bash
cd jot && npm test
cargo test -p screenpipe-recall    # when recall routes touched
./scripts/verify-stack.sh          # when engine/query touched
node --check jot/app-main.js
```

Manual: app switch overlay, dismiss/snooze, capture note, query recordings finds recent OCR text, Pakr reorg with confirm (P2+).

## Implementation hints

| Area | Where |
|------|--------|
| Notes | `jot/db.js`, `jot/renderer/`, capture modules |
| Query | `integration/screenpipeClient.js`, `jot/renderer/renderer.js` (`runRewindSearch`, `runAsk`) |
| Engine | `integration/engineManager.js` |
| Overlay | `jot/overlay/`, `jot/recallWatcher.js` |
| Time resurface | **build:** `jot/timeResurfaceParser.js`, `timeResurfaceScheduler.js` |
| Pakr | **build:** `jot/pakr/` |

Screenpipe API reference: `proactive-recall/.claude/skills/screenpipe-api/SKILL.md`

## Scope creep — STOP if you are about to

- Add microphone/camera capture
- Put LLM on app-switch evaluate hot path
- Require a separate Screenpipe Tauri app for daily use
- Remove engine without replacing query path
- Port full recall policy to JS for production (Rust policy OK for recall; notes-first overlay OK in jot)

## Finish criteria

Set `PAKRAI_PROGRESS.md` status to **`beta-ready`** when P0, P6, P1, P2, P3, P4 exit criteria pass and P5 items are tracked.

Post a short summary: what shipped, test commands, human-only steps (TCC, notarization).

**Start now:** read `docs/pakrai/SCOPE.md`, then begin **P0**.
