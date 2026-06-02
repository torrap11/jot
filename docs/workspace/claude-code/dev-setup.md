# Dev setup — Jot × Screenpipe

**Phase 0 — engine sidecar + recall client stub**

---

## Prerequisites

macOS (Apple Silicon or Intel). You need:

- Rust toolchain: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- `brew install pkg-config ffmpeg jq cmake wget git-lfs`
- Xcode **not required** for engine build (a11y uses git `cidre`). Full Xcode only if you hit other native build issues.
- Node.js ≥ 18 + npm (for Jot)

---

## 1. Build the screenpipe engine

```bash
cd screenpipe-x-jot
./scripts/build-engine.sh
```

This produces `engine/target/release/screenpipe`. First build takes 5–15 min.  
Uses `CARGO_TARGET_DIR=engine/target` so Jot’s `engineManager` finds the binary.

---

## 2. Configure the API key (optional in Phase 0)

The local API key secures recall routes. In dev, omit it or set a dummy value:

```bash
export SCREENPIPE_API_KEY=dev-key-123
# or: export SCREENPIPE_API_KEY=$(engine/target/release/screenpipe auth token)
```

Production: store in Jot's userData `.env` file (same pattern as the Anthropic key).

---

## 3. Run Jot (sidecar auto-starts)

```bash
cd .
npm install   # first time only
npm start
```

Jot resolves the integration modules from `../screenpipe-x-jot/integration/` (relative
to the actual jot checkout at `github-real/`). Watch the Electron console for:

```
[app] Integration modules loaded from .../integration
[app] Engine status: starting
[screenpipe] ... (engine stdout)
[app] Engine status: running
```

### Override binary path

```bash
SCREENPIPE_BIN=/custom/path/screenpipe npm start
```

### Override integration path

```bash
SCREENPIPE_INTEGRATION_PATH=/path/to/integration npm start
```

### Disable engine auto-start

```bash
SCREENPIPE_ENABLED=false npm start
```

---

## 4. Verify health

```bash
curl -s http://127.0.0.1:3030/health
```

Expected response: `{"status":"ok","..."}` or similar.

---

## 5. Test recall dry-run (Phase 0 — engine not yet recall-capable)

From the Jot menu: **Engine → Manual Recall (dry-run)**, or press **⌘⇧R**.

The result is logged to the Electron DevTools console (`View → Toggle Developer Tools`).
While Phase 1 is incomplete, you'll see:

```json
{ "available": false, "reason": "recall not yet implemented" }
```

This confirms the integration path resolves correctly and Jot reaches the engine.

---

## 6. Recall curl examples (Phase 1+)

```bash
# Status
curl http://127.0.0.1:3030/recall/status

# Evaluate (manual trigger, live)
curl -X POST http://127.0.0.1:3030/recall/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":false,"override":null}'

# Evaluate (dry-run, no UI surface)
curl -X POST http://127.0.0.1:3030/recall/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":true,"override":null}'

# Action
curl -X POST http://127.0.0.1:3030/recall/action \
  -H 'Content-Type: application/json' \
  -d '{"event_id":1,"action":"snooze","snooze_minutes":30}'

# SSE stream
curl -N http://127.0.0.1:3030/recall/stream
```

Add `-H 'Authorization: Bearer <key>'` when `SCREENPIPE_LOCAL_API_KEY` is set.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Binary missing or not executable` | Run `cargo build --release --features metal,apple-intelligence` in `engine/` |
| `Integration modules not found` | Check `SCREENPIPE_INTEGRATION_PATH` or confirm workspace symlink layout |
| `Engine status: error` after restart cap | Kill any orphan `screenpipe` process: `pkill screenpipe` |
| TCC / Automation permission prompt | Grant Jot access to System Events in macOS Privacy settings |

---

## Manual QA (macOS TCC — cannot automate)

See `docs/claude-code/manual-qa.md` (to be written in Phase 2).

Steps that require human verification:

1. Fresh install on a new macOS user: confirm TCC prompts for Screen Recording, Automation.
2. Revoke Automation permission mid-session: confirm graceful degradation (no crash).
3. Kill `screenpipe` externally: confirm Jot restarts it within 30 s.
