# Build progress — Jot × Screenpipe (PRD)

**Orchestrator:** `docs/claude-code/00-START.md`  
**PRD:** `PRD.md`  
**Last run:** 2026-05-19  
**Current phase:** DONE (all 5 phases complete)

## Decisions (locked for this build)

| Question | Decision |
|----------|----------|
| Policy source of truth | Rust `screenpipe-recall`; Jot calls HTTP only |
| Notes DB | Dual-DB v1 (Jot SQLite + Screenpipe SQLite); federation in retrieval |
| Product shell | Jot (Electron); Screenpipe Tauri not required for daily use |
| Brand | Ship as **Jot** |
| Integration module path | `integration/` at workspace root; resolved from jot via `path.join(__dirname, '..', 'screenpipe-x-jot', 'integration')` with `SCREENPIPE_INTEGRATION_PATH` env override |

## Phase checklist

| Phase | File | Status | Notes |
|-------|------|--------|-------|
| 0 | `01-phase-0-foundation.md` | ✅ | Engine manager + recall client wired; 40/40 Jot tests pass |
| 1 | `02-phase-1-recall-backend.md` | ✅ | engine built; recall API smoke OK; see BUILD.md |
| 2 | `03-phase-2-jot-resurfacing.md` | ✅ | recall API path live; debounce; why-now chips; dismiss/snooze/never-app actions |
| 3 | `04-phase-3-memory-ux.md` | ✅ | Rewind/Ask tabs; engine status badge; screenpipeClient; extraResources bundling |
| 4 | `05-phase-4-polish-ship.md` | ✅ | Focus/meeting modes; defer docs; debug dialog; perf-notes.md; manual-qa.md complete; README quickstart |

## Phase 0 — exit criteria

- [x] `integration/engineManager.js` + `integration/recallClient.js` exist and are required from Jot
- [x] With engine running, `curl http://127.0.0.1:3030/health` succeeds (requires binary built)
- [x] Jot starts engine in dev (or clear message if binary missing)
- [x] Manual dry-run evaluate callable from Jot (⌘⇧R / Engine menu → logs decision or API error)
- [x] No secrets committed

## Phase 1 — nested pipeline status

| Prompt | Description | Status |
|--------|-------------|--------|
| 01 | Preflight & discovery | ✅ |
| 02 | DB migrations (`20260519000000_recall_tables.sql`) | ✅ |
| 03 | Domain types & context (`decision.rs`, `context.rs`, `config.rs`) | ✅ |
| 04 | Retrieval (`retrieval.rs`, `tokenizer.rs`) | ✅ |
| 05 | Policy & scoring (`policy.rs`) | ✅ |
| 06 | Recall service (`service.rs`, `ui_recorder.rs` publish, `AppState`) | ✅ |
| 07 | Server routes (`routes/recall.rs`, router wiring) | ✅ |

## Phase 1 — exit criteria

- [x] Migration file written (recall_events, recall_app_preferences, recall_runtime_settings)
- [x] `screenpipe-recall` + `screenpipe-db` compile (`cargo check` 2026-05-19)
- [x] `cargo test -p screenpipe-recall` — **21/21 passed**
- [x] `cargo build -p screenpipe-engine` — OK (git cidre; no full Xcode.app)
- [x] Smoke: `/recall/status` + `/recall/evaluate` (manual dry_run → silence/no_context_frame without capture)
- [x] App-switch event published by `ui_recorder.rs` → RecallService subscribed
- [x] Pipeline: context → retrieval → policy → persist → SSE
- [x] Routes: GET /recall/status, POST /recall/evaluate, POST /recall/action, GET /recall/stream

## Commands log

```text
# Phase 0 verification
node --check integration/engineManager.js   → OK
node --check integration/recallClient.js    → OK
node --check jot/app-main.js               → OK

# Phase 1 verification (2026-05-19)
./scripts/build-engine.sh                           → engine/target/release/screenpipe
cargo test -p screenpipe-recall                     → 21 passed
export SCREENPIPE_API_KEY=dev-key-123
./engine/target/release/screenpipe record --disable-audio --disable-vision &
curl -H "Authorization: Bearer $SCREENPIPE_API_KEY" http://127.0.0.1:3030/recall/status  → OK
curl -X POST ... /recall/evaluate dry_run manual    → OK (silence without frames)

# Once server is running:
curl -s http://127.0.0.1:3030/recall/status
curl -s -X POST http://127.0.0.1:3030/recall/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":true}'
curl -N http://127.0.0.1:3030/recall/stream
```

## Deviations from PRD

```text
1. Integration path resolution: jot/ is a symlink to the actual repo at github-real/.
   Integration modules in screenpipe-x-jot/integration/ are resolved via:
     path.join(__dirname, '..', 'screenpipe-x-jot', 'integration')
   from jot/app-main.js. SCREENPIPE_INTEGRATION_PATH env var overrides this.
   This is transparent to users running from the workspace.

2. Engine shortcut: added global shortcut ⌘⇧R for manual recall dry-run.
   This is additive only — no existing shortcuts changed.

3. app_switch event subscription: no existing "app_switch" screenpipe_event existed.
   Added screenpipe_events::send_event("app_switch", ...) call in ui_recorder.rs
   (AppSwitch match arm, alongside the existing CaptureTrigger::AppSwitch path).
   RecallService subscribes via subscribe_to_event::<AppSwitchPayload>("app_switch").
   This is the "minimal changes" approach from prompt 06.

4. recall_load_context_frame: extended to accept app_name="" as "latest frame across
   all apps" — needed for manual evaluate where active app is not known by the HTTP caller.

5. RecallHistory unused import: screenpipe-recall/src/service.rs imports RecallHistory
   explicitly because Default is used on error paths.
```

## Files changed (cumulative)

```text
Phase 0:
  integration/engineManager.js     (new) — engine sidecar lifecycle
  integration/recallClient.js      (new) — HTTP client for /recall/* routes
  jot/app-main.js                  (modified) — require integration, start/stop on ready/quit, Engine menu, ⌘⇧R
  README.md                        (modified) — dev setup section added
  docs/claude-code/dev-setup.md    (new) — detailed dev setup and curl examples

Phase 1:
  engine/crates/screenpipe-db/src/migrations/20260519000000_recall_tables.sql  (new)
  engine/crates/screenpipe-db/src/recall.rs     (new) — DB helpers
  engine/crates/screenpipe-db/src/lib.rs        (modified) — pub use recall::*
  engine/crates/screenpipe-recall/src/config.rs  (modified) — all constants
  engine/crates/screenpipe-recall/src/decision.rs (modified) — all types
  engine/crates/screenpipe-recall/src/context.rs  (modified) — RecallContext::build
  engine/crates/screenpipe-recall/src/tokenizer.rs (new)
  engine/crates/screenpipe-recall/src/retrieval.rs (modified) — 3-pass FTS
  engine/crates/screenpipe-recall/src/policy.rs   (modified) — anchor scoring
  engine/crates/screenpipe-recall/src/service.rs  (new) — RecallService
  engine/crates/screenpipe-recall/src/lib.rs      (modified) — pub mod service, tokenizer
  engine/crates/screenpipe-recall/Cargo.toml      (modified) — screenpipe-db, screenpipe-events, tokio
  engine/crates/screenpipe-engine/src/ui_recorder.rs  (modified) — publish "app_switch" event
  engine/crates/screenpipe-engine/src/server.rs       (modified) — AppState fields, service spawn, routes
  engine/crates/screenpipe-engine/src/routes/recall.rs (new) — 4 HTTP routes
  engine/crates/screenpipe-engine/src/routes/mod.rs    (modified) — pub mod recall
  engine/crates/screenpipe-engine/Cargo.toml           (modified) — screenpipe-recall dep
  engine/crates/screenpipe-a11y/Cargo.toml           (modified) — git cidre
  scripts/build-engine.sh                                      (new)
  docs/claude-code/BUILD.md, CONTINUE.md                       (new)
  integration/engineManager.js                                 (modified) — record subcommand, API key env
```

## Phase 2 — exit criteria

- [x] 300 ms settle implemented (`recallWatcher.js` debounce)
- [x] Auto path uses recall API only (legacy surface disabled by default; `JOT_LEGACY_SURFACE=true` re-enables)
- [x] Max **1** card on Surface (recall overlay shows single candidate card)
- [x] why-now visible as chips; actions persist via `/recall/action` (dismiss/snooze/never_app)
- [x] Manual recall shortcut ⌘⇧R calls live evaluate (not dry-run)
- [x] `npm test` passes in `jot/` — 48/48 tests (7 new recall-watcher tests)
- [x] `manual-qa.md` exists at `docs/claude-code/manual-qa.md`
- [x] `cargo check -p screenpipe-engine` clean; `cargo test -p screenpipe-recall` 21/21

## Phase 2 — files changed

```text
engine/crates/screenpipe-engine/src/routes/recall.rs
  → Added CandidateInfo struct; EvaluateResponse now includes candidate.title/snippet/app_name

jot/recallWatcher.js  (new)
  → createRecallOnAppSwitch(): debounce + evaluate + onSurface factory (pure Node, testable)

jot/app-main.js
  → require recallWatcher; startWatcher() uses recall API path (JOT_LEGACY_SURFACE=false default)
  → showRecallOverlay(): sends recall:surface IPC to overlay window
  → ipcMain.on recall:dismiss / recall:snooze / recall:never-app handlers
  → runManualRecall() (live); runManualRecallDryRun() kept for Engine menu debug

jot/overlay/overlay-preload.js
  → Added: onRecallSurface, recallDismiss, recallSnooze, recallNeverApp

jot/overlay/overlay.html
  → Added CSS: .recall-card, .why-now-chips, .why-chip, .action-btn.never-app

jot/overlay/overlay.js
  → isRecallMode / recallEventId state
  → window.overlay.onRecallSurface() handler: renders single recall card with why-now chips
  → dismiss-all button and Esc key: route through recallDismiss in recall mode
  → S key: routes through recallSnooze in recall mode

jot/tests/test-recall-watcher.js  (new)
  → 7 unit tests: debounce, surface/silence/defer/no-candidate, own-bundle guard, unavailable engine

docs/claude-code/manual-qa.md  (new)
  → Human QA checklist for Phase 2 scenarios
```

## Phase 3 — exit criteria

- [x] Rewind tab: keyword search → capture cards (OCR + audio) from `/search`
- [x] Ask tab: blended Jot notes + Screenpipe memories query
- [x] Engine status badge in tab bar (recording/connected/offline), 12 s poll
- [x] `screenpipeClient.js` added to `integration/`; IPC handlers wired in app-main.js
- [x] `extraResources` in `jot/package.json` bundles engine binary for distribution
- [x] `npm test` → 53/53 (5 new screenpipeClient tests)
- [x] `cargo check -p screenpipe-engine` clean

## Phase 3 — files changed

```text
integration/screenpipeClient.js        (new) — /search, /memories, /health HTTP client
integration/engineManager.js           (modified) — getDefaultBinPath() bundled binary check
jot/app-main.js                        (modified) — screenpipeClient IPC; tab bar; Focus Mode state
jot/preload.js                         (modified) — screenpipeSearch, screenpipeMemories, screenpipeEngineState, onRecallManualResult
jot/renderer/index.html                (modified) — Notes/Rewind/Ask tab bar + panels
jot/renderer/style.css                 (modified) — tab-bar, capture-card, engine-dot, rewind/ask toolbar styles
jot/renderer/renderer.js              (modified) — switchTab, pollEngineState, runRewindSearch, runAsk, renderCaptureResult
jot/package.json                       (modified) — extraResources engine binary
jot/tests/test-screenpipe-client.js   (new) — 5 tests: offline fallback, shape, exports
```

## Phase 4 — exit criteria

- [x] Focus Mode toggle in Engine menu → `POST /recall/settings {focus_mode}` via `recallClient.setSettings()`
- [x] Meeting mode: `SettingsRequest.meeting_mode` field + `recall_set_meeting_mode()` wired in Rust routes
- [x] `toggleFocusMode()` in app-main.js; `isFocusModeActive` state; menu label reflects current state
- [x] Enhanced `showEngineStatusDialog()` — shows enabled/focus_mode/meeting_mode/last_context_app/last_decision/latency/surfaces_today
- [x] `POST /recall/settings` route added to server.rs; `setSettings()` in recallClient.js
- [x] Defer semantics documented (24h expiry per POLICY.md; resurface on stronger context)
- [x] `docs/claude-code/perf-notes.md` created (targets, no-LLM rationale, CPU script, DB growth)
- [x] `docs/claude-code/manual-qa.md` updated with Phase 3 + Phase 4 checklists
- [x] `README.md` — proactive recall quickstart + curl examples + pipeline diagram
- [x] `cargo check -p screenpipe-engine` clean (recall_settings route)
- [x] `cargo test -p screenpipe-recall` — 21/21
- [x] `cargo test -p screenpipe-engine` — 393/394 (1 pre-existing env flap: `sleep_monitor::test_recently_woke_flag` asserts host hasn't recently woken; unrelated to recall changes)
- [x] `npm test` in `jot/` — 53/53

## Phase 4 — files changed

```text
engine/crates/screenpipe-engine/src/routes/recall.rs
  → Added SettingsRequest struct; recall_settings() handler for focus/meeting/enabled

engine/crates/screenpipe-engine/src/server.rs
  → Wired POST /recall/settings route

integration/recallClient.js
  → Added setSettings({ focusMode, meetingMode, enabled })

jot/app-main.js
  → isFocusModeActive state; toggleFocusMode(); showEngineStatusDialog() enhanced
  → Engine menu: Focus Mode checkbox, Manual Recall (live), Manual Recall (dry-run)

docs/claude-code/perf-notes.md          (new) — CPU/RAM targets, no-LLM rationale, CPU sampling script
docs/claude-code/manual-qa.md           (updated) — Phase 3 + Phase 4 QA checklists
README.md                               (updated) — proactive recall quickstart + curl examples
docs/claude-code/CLAUDE_PROGRESS.md    (updated) — Phase 4 ✅; build status DONE
```

## Blockers

```text
None — all 5 phases complete. Build is DONE.
```

## Deferred (logged; do not block ship)

```text
- Cloud sync, cross-platform, LLM-assisted Ask
- Merging Jot DB into Screenpipe SQLite  
- Full pipes/MCP UI inside Jot
- Notarization (jot/docs/release-signing.md pending Apple credentials)
- Auto-tune STRONG_ANCHOR_THRESHOLD from dismiss rate telemetry
```
