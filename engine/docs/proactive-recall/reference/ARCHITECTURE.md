# Architecture — module ownership

| Crate / app | Owns |
|-------------|------|
| `screenpipe-events` | App-switch trigger exposure (minimal touch) |
| `screenpipe-recall` | Context, retrieval orchestration, policy, defer, why-now, service helpers |
| `screenpipe-db` | Migrations, FTS queries, recall CRUD, preferences |
| `screenpipe-engine` | Service lifecycle, REST, SSE, startup wiring |
| `screenpipe-app-tauri` | Card window, SSE client, dismiss/snooze/never-app, manual trigger, focus toggle |

## Workspace note

Root `Cargo.toml` typically includes `crates/*` but **excludes** `apps/screenpipe-app-tauri/src-tauri`.

Run Rust checks in:

1. Repo root (`cargo test -p screenpipe-recall` etc.)
2. `apps/screenpipe-app-tauri/src-tauri`

## Runtime flow

1. App-switch event arrives
2. Wait 300 ms
3. Build `RecallContext`
4. Retrieve candidates (FTS + filters)
5. `RecallPolicy::evaluate` → Surface | Defer | Silence
6. Persist `recall_events` + latency fields
7. If Surface → emit SSE / UI event
8. If Defer → store pending; recheck on next eligible trigger (expire 24h)

## Fallbacks (only if blocked)

- Event subscription hard → poll latest app-switch row at low interval inside server
- SSE hard → Tauri event bridge; keep HTTP evaluate/status
- Placement APIs messy → working card first, macOS polish second
- Ambiguous policy branch → **Silence**
