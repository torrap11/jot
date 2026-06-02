# Phase 06 — Recall service & events

## Goal

Long-lived recall service in `screenpipe-engine` subscribed to app-switch + manual hook.

## Read first

- `docs/proactive-recall/reference/ARCHITECTURE.md`
- `crates/screenpipe-events` app-switch path
- Server startup (`main.rs` / `lib.rs`)

## Tasks

1. **`screenpipe-recall/src/service.rs`:**
   - `RecallService::run` or equivalent
   - On `AppSwitch`: sleep 300 ms → build context → retrieve → evaluate → persist
   - Record `latency_context_ms`, `latency_retrieval_ms`, `latency_policy_ms`, `latency_persist_ms`, `latency_total_ms`
   - On `Surface`: call injectable `on_surface(RecallDecision)` (SSE wired in phase 07)
   - On `Defer`: persist pending state
   - On `Silence`: persist only
2. **Wire into server startup** alongside existing services.
3. **Events:** subscribe to app-switch from `screenpipe-events` (minimal changes). Fallback: poll latest app-switch row at low interval **only** if subscription blocked — document in `CLAUDE_PROGRESS.md`.
4. **Manual path:** expose `evaluate_manual()` used by HTTP in phase 07.
5. Ensure `screenpipe-recall` is a dependency of `screenpipe-engine`; register crate in workspace if missing.

## Exit criteria

- [ ] Server starts with recall service enabled
- [ ] App switch (or simulated event) produces a row in `recall_events`
- [ ] Latency columns populated
- [ ] Phase 06 checked in progress file

## Verification

```bash
cargo build -p screenpipe-engine
cargo test -p screenpipe-recall
# optional: run server + trigger app switch manually
```

## Do not

- Expose HTTP routes yet (phase 07)
- Build Tauri UI yet
