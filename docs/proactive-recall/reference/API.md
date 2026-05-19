# API contract — recall routes

Implement in `screenpipe-engine`. Port follows existing Screenpipe localhost default (often `3030`).

## `GET /recall/status`

Returns: `enabled`, `focus_mode`, `meeting_mode`, `pending_deferred`, `last_context`, `last_decision`, `latency_ms`.

## `POST /recall/evaluate`

Request:

```json
{
  "trigger": "manual",
  "dry_run": false,
  "override": null
}
```

- `manual` → evaluate immediately
- `dry_run=true` → no UI surface event; still return decision
- `override` → optional synthetic context for debug

Response: `event_id`, `decision` (action, confidence, why_now, candidate, …).

## `POST /recall/action`

```json
{
  "event_id": 912,
  "action": "snooze",
  "snooze_minutes": 30
}
```

Actions: `dismiss` | `snooze` | `never_app`

## `GET /recall/stream` (SSE)

Events:

- `recall.surface`
- `recall.status`
- `recall.action_applied`

## curl examples (for README)

```bash
curl http://127.0.0.1:3030/recall/status

curl -X POST http://127.0.0.1:3030/recall/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":false,"override":null}'

curl -X POST http://127.0.0.1:3030/recall/action \
  -H 'Content-Type: application/json' \
  -d '{"event_id":1,"action":"snooze","snooze_minutes":30}'
```
