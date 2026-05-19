# Phase 02 — Database migrations

## Goal

Add recall tables and Rust types/helpers skeleton in `screenpipe-db`.

## Read first

- `docs/proactive-recall/reference/SCHEMA.md`
- `CLAUDE_PROGRESS.md` schema notes
- Existing migration style in `crates/screenpipe-db/src/migrations/`

## Tasks

1. Add migration SQL for `recall_events`, `recall_app_preferences`, `recall_runtime_settings` per `reference/SCHEMA.md` (adapt only if phase 01 requires).
2. Register migration in the repo’s migration runner.
3. Add Rust types for recall rows/events if the crate uses typed structs.
4. Implement **stub or full** DB helpers (signatures must match `SCHEMA.md`):
   - `recall_insert_event`
   - `recall_load_status`
   - `recall_load_history`
   - `recall_load_preferences`
   - `recall_apply_action`
   - `recall_set_focus_mode`
   - `recall_set_app_opt_out`
   - Placeholders OK for `recall_load_context` / `recall_query_candidates` if phase 04 owns query logic — but signatures must exist.
5. Use existing DB manager + write queue patterns.

## Exit criteria

- [ ] Migration applies on fresh and existing DB (run migration test or manual apply per repo convention)
- [ ] Helpers compile; insert + load status work in a minimal unit test or `cargo test` smoke
- [ ] Phase 02 checked in `CLAUDE_PROGRESS.md`

## Verification

```bash
cargo test -p screenpipe-db -- recall
cargo fmt
```

## Do not

- Implement FTS retrieval SQL yet (phase 04)
- Wire server routes yet
