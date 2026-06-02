# Build & run — proactive recall stack

## One-time

```bash
# Rust (if needed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# macOS deps (no full Xcode.app required — a11y uses git cidre)
brew install pkg-config ffmpeg jq cmake wget git-lfs

# Engine binary → engine/target/release/screenpipe
cd screenpipe-x-jot
./scripts/build-engine.sh
```

## API key

```bash
export SCREENPIPE_API_KEY=dev-key-123   # or: $(engine/target/release/screenpipe auth token)
```

Pass the same value when starting Jot so `engineManager` forwards it to the child process.

## Run engine alone

```bash
engine/target/release/screenpipe record --port 3030
# minimal dev (API only, no capture):
# ... record --disable-audio --disable-vision
```

## Smoke test recall

```bash
curl -s http://127.0.0.1:3030/health
curl -s -H "Authorization: Bearer $SCREENPIPE_API_KEY" http://127.0.0.1:3030/recall/status
curl -s -X POST -H "Authorization: Bearer $SCREENPIPE_API_KEY" -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":true}' http://127.0.0.1:3030/recall/evaluate
```

## Run Jot + sidecar

```bash
export SCREENPIPE_API_KEY=dev-key-123
cd . && npm start
```

Engine menu · ⌘⇧R manual recall dry-run.

## macOS permissions (real proactive recall)

- **Screen Recording** — frames / FTS
- **Accessibility** — app_switch events for auto recall
- **Automation** (Jot) — frontmost app for legacy note surfacing

## Fixes applied (2026-05-19)

- `screenpipe-a11y`: crates.io `cidre 0.13` → git `cidre` (avoids Xcode.app requirement)
- `recall.rs`: sqlx `&mut **tx.conn()`
- `routes/recall.rs`: sync `filter_map` for SSE
- `ui_recorder.rs`: `document_path` null in app_switch payload
- `engineManager`: `screenpipe record` + `SCREENPIPE_API_KEY`
