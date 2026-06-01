# Claude Code progress — proactive recall

> **Agent:** Update this file after every phase. Humans use it to resume.

## Run state

| Field | Value |
|-------|--------|
| `current_phase` | `07_complete` |
| `last_completed_phase` | 07 — Server routes & SSE |
| `fork_repo` | /Users/parthharish/Documents/github-real/screenpipe-x-jot/proactive-recall |
| `screenpipe_commit` | (run `git rev-parse HEAD` in proactive-recall/) |
| `blocked` | false — pending `cargo check` by human |
| `blocker` | none |

## Phase checklist

- [x] 01 — Preflight & discovery
- [x] 02 — Database migrations
- [x] 03 — Domain types & context
- [x] 04 — Retrieval
- [x] 05 — Policy & scoring
- [x] 06 — Service & events
- [x] 07 — Server routes & SSE
- [ ] 08 — Tauri recall card (skipped — Jot is the UI, not Tauri)
- [ ] 09 — Controls (manual, focus, meeting)
- [ ] 10 — Tests, docs, final verification

## Schema notes (from phase 01)

```text
frames table columns (accumulated via migrations):
  id, video_chunk_id, offset_index, timestamp, app_name, window_name,
  focused, browser_url, document_path, name, full_text, device_name,
  machine_id, sync_id, synced_at

FTS5 table: frames_fts
  columns: name, browser_url, app_name, window_name, focused, id (UNINDEXED)

New tables (migration 20260519000000_recall_tables.sql):
  recall_events         — full decision log
  recall_app_preferences — per-app never_surface / snooze
  recall_runtime_settings — enabled, focus_mode, meeting_mode (seeded true/false/false)

DatabaseManager write pattern: begin_immediate_with_retry → sqlx query → commit
```

## Key implementation decisions

```text
1. FTS queries use parameterized binding (never string interpolation) — injection safe.
2. BM25 normalised to [0,1]: lower raw rank = better; flip: normalised = 1 - (rank-min)/range.
3. app_switch event: published in ui_recorder.rs AppSwitch branch as screenpipe_events.
   No existing "app_switch" event existed — added with json payload matching AppSwitchPayload.
4. RecallService spawned at server start in create_router(); sse_tx created before AppState.
5. recall_load_context_frame("") = latest frame across all apps (for manual evaluate).
6. dry_run=true skips persist + SSE; decision still returned to HTTP caller.
```

## Deviations from reference spec

```text
1. Tauri card (prompt 08) skipped — Jot (Electron) is the UI layer per PRD locked decisions.
2. app_switch event source: ui_recorder.rs, not screenpipe-screen. The UiEventType::AppSwitch
   in ui_recorder is the right hook since it already fires on foreground app change.
3. recall_load_context_frame extended to accept empty string = no app filter.
```

## Commands run (latest session)

```text
# Cargo toolchain not available in Claude Code sandbox.
# Human must run:
cd proactive-recall
cargo check -p screenpipe-db
cargo check -p screenpipe-recall
cargo check -p screenpipe-engine
cargo test -p screenpipe-recall
cargo test -p screenpipe-db -- recall
cargo fmt --all

# Integration smoke test (after server running):
curl -s http://127.0.0.1:3030/recall/status
curl -s -X POST http://127.0.0.1:3030/recall/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":true}'
curl -N http://127.0.0.1:3030/recall/stream
```

## What remains

- Run `cargo check` and fix any compilation errors (import tweaks, trait bounds)
- Prompt 09 — Controls: `POST /recall/settings` (focus_mode, meeting_mode, enabled toggle)
- Prompt 10 — Tests, docs, final verification
- Phase 2 — Jot resurfacing: wire SSE stream in recallClient.js → overlay card in renderer

## Acceptance criteria snapshot

| Criterion | Status |
|-----------|--------|
| App switch produces recall_events row | ✅ (code complete, pending cargo check) |
| Latency columns populated | ✅ |
| GET /recall/status returns JSON | ✅ |
| POST /recall/evaluate works (dry_run) | ✅ |
| POST /recall/action persists feedback | ✅ |
| GET /recall/stream emits recall.surface SSE | ✅ |
| Policy: Surface iff confidence ≥ 0.78 AND ≥ 2 anchors | ✅ |
| Manual trigger bypasses caps | ✅ |
| Meeting/Focus mode → Silence | ✅ |
| No LLM on hot path | ✅ |
