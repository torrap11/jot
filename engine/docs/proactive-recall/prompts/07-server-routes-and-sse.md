# Phase 07 — Server routes & SSE

## Goal

HTTP API + SSE stream for recall; wire `on_surface` from phase 06.

## Read first

- `docs/proactive-recall/reference/API.md`
- Existing route modules in `screenpipe-engine`

## Tasks

Implement routes (adapt module layout to fork):

| Route | Behavior |
|-------|----------|
| `GET /recall/status` | enabled, focus, meeting, pending_deferred, last_context, last_decision, latency_ms |
| `POST /recall/evaluate` | body: trigger, dry_run, override — call service; return event_id + decision |
| `POST /recall/action` | dismiss / snooze / never_app → `recall_apply_action` |
| `GET /recall/stream` | SSE: `recall.surface`, `recall.status`, `recall.action_applied` |

1. Add `recall*.rs` route module; register in router.
2. Connect `RecallService` `on_surface` → broadcast SSE event.
3. `dry_run=true` → no SSE surface event; still return decision (document whether event row is written).
4. JSON types for request/response — match `reference/API.md`.

## Exit criteria

- [ ] `curl` status + evaluate + action work against running server
- [ ] SSE client receives `recall.surface` when policy returns Surface (use `curl -N` or small test)
- [ ] Phase 07 checked in progress file

## Verification

```bash
cargo build -p screenpipe-engine
# start server per fork README, then:
curl -s http://127.0.0.1:3030/recall/status
curl -s -X POST http://127.0.0.1:3030/recall/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":true,"override":null}'
```

Adjust port to fork default.

## Do not

- Build Tauri card yet
