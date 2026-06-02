# Phase 01 — Preflight & discovery

## Goal

Understand the fork, confirm buildability, and produce a schema map so later phases do not guess column names.

## Read first

- `docs/proactive-recall/reference/PRODUCT.md`
- `docs/proactive-recall/reference/ARCHITECTURE.md`
- `docs/proactive-recall.md` (research — skim executive summary)
- Fork-local if present:
  - `docs/proactive-recall/architecture.md`, `roadmap.md`, `interaction-model.md`
  - `crates/screenpipe-recall/src/**`
  - `crates/screenpipe-db/src/migrations/*`
  - `crates/screenpipe-db/src/db.rs`, `types.rs`
  - `crates/screenpipe-events/src/**`
  - `crates/screenpipe-engine/src/**/routes*.rs`, `search*.rs`
  - `apps/screenpipe-app-tauri/**` (package.json, app/, components/, src-tauri/)

## Tasks

1. Record fork path and `git rev-parse HEAD` in `CLAUDE_PROGRESS.md`.
2. Confirm `screenpipe-recall` crate exists (create stub crate if missing — minimal `lib.rs` only if truly absent).
3. Document **actual** schema for: `frames`, `frames_fts`, `ui_events`, app-switch fields, `browser_url`, `document_path`, trigger columns.
4. Note how app-switch events are emitted today (event name, payload shape).
5. Note localhost API port and how server + Tauri are started (scripts in README or package.json).
6. Run a baseline compile:
   - `cargo check -p screenpipe-db -p screenpipe-engine` (adjust package names to fork)
   - `cargo check` in `apps/screenpipe-app-tauri/src-tauri` if present
7. Write **Schema notes** section in `CLAUDE_PROGRESS.md` with real column names.
8. Write **Deviations** if fork differs from `reference/SCHEMA.md` / `POLICY.md`.

## Exit criteria

- [ ] `CLAUDE_PROGRESS.md` has fork commit, schema notes, and phase 01 checked
- [ ] Baseline `cargo check` succeeds (or documented pre-existing failures unrelated to recall)
- [ ] Clear answer: where app-switch hooks in and where to add recall service

## Verification

```bash
cargo check -p screenpipe-db
# plus src-tauri check if applicable
```

## Do not

- Implement recall logic yet
- Add migrations yet (phase 02)
