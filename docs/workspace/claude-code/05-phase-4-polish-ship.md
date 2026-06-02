# Phase 4 — Polish & ship

**PRD ref:** §11 Phase 4, §12 metrics, §13 risks  
**Goal:** Defer batching, focus/meeting modes, debug surfaces, perf notes, release docs.

---

## Read first

- `engine/docs/engine/prompts/09-controls-and-modes.md`
- `engine/docs/engine/prompts/10-tests-docs-and-ship.md`
- `PRD.md` §12–§13

---

## Tasks

### 1. Controls & modes (Rust + Jot)

- Meeting mode inference (Zoom/Meet/Teams heuristics) → auto Silence
- Focus mode toggle in Jot settings → `POST` or DB pref via recall API
- Manual recall bypass verified with tests

### 2. Defer semantics

- Confirm deferred candidates resurface on stronger context (integration test or documented manual case)
- 24h defer expiry per `POLICY.md`

### 3. Debug / status

- Jot dev panel or menu: last `RecallContext`, last decision, latency_ms from `/recall/status`
- Export last 10 `recall_events` for support (redact sensitive text option)

### 4. Performance & ops

- Document expected CPU/RAM targets in `docs/claude-code/perf-notes.md`
- Optional: script to sample engine CPU during 10 min capture
- Notarization: link `jot/docs/release-signing.md`; do not block on credentials

### 5. Docs ship package

- Workspace README: end-to-end quickstart
- `docs/claude-code/manual-qa.md` updated for full product
- `PRD.md` phase checklist marked complete in `CLAUDE_PROGRESS.md`
- Curl + screenshot placeholders for recall if helpful

### 6. Nested prompt 10 (adapted)

From `10-tests-docs-and-ship.md`: run full `cargo test` on touched crates + `src-tauri` smoke if engine app touched; final acceptance review.

---

## Exit criteria

- [ ] Meeting + focus suppression work (auto vs manual)
- [ ] Defer recheck behavior documented + tested
- [ ] Debug status visible in Jot
- [ ] `perf-notes.md` + `manual-qa.md` complete
- [ ] PRD phases 0–4 marked done in `CLAUDE_PROGRESS.md`
- [ ] No critical stubs in recall hot path

---

## Verification

```bash
cd engine && cargo test -p screenpipe-recall && cargo test -p screenpipe-engine
cd . && npm test
```

Print final orchestrator summary per `00-START.md`.

---

## Deferred (log in progress file, do not block ship)

- Cloud sync, cross-platform, LLM Ask
- Merging Jot DB into Screenpipe SQLite
- Full pipes/MCP UI inside Jot

---

## On completion

Mark build **DONE** in `CLAUDE_PROGRESS.md`. Run final summary for user.
