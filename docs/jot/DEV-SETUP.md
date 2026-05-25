# Jot — dev setup

Includes **screen recording** + **query** via Screenpipe engine.

---

## Prerequisites

- macOS  
- Node.js ≥ 18  
- Rust + `brew install pkg-config ffmpeg jq cmake wget git-lfs` (for engine)

---

## One-time

```bash
cd screenpipe-x-jot
./scripts/setup-workspace.sh
./scripts/build-engine.sh
```

Binary: `proactive-recall/target/release/screenpipe`

---

## Daily

```bash
./scripts/run-dev.sh
```

Or:

```bash
export SCREENPIPE_API_KEY=dev-key-123
cd jot && npm start
```

---

## Permissions

| Permission | Required |
|------------|----------|
| **Screen Recording** | **Yes** — capture + query |
| **Automation** | Yes |
| **Accessibility** | Recommended |

---

## Verify

```bash
./scripts/verify-stack.sh
cd jot && npm test
cargo test -p screenpipe-recall   # if using recall routes
```

**Query smoke:** open Recordings search, run a query against recent activity.

---

## Dev without engine (notes only)

```bash
SCREENPIPE_ENABLED=false npm start
```

Query panels show offline; notes still work.

---

## Env

| Variable | Purpose |
|----------|---------|
| `SCREENPIPE_API_KEY` | Local API auth |
| `SCREENPIPE_BIN` | Engine path override |
| `SCREENPIPE_ENABLED` | `false` disables sidecar |
