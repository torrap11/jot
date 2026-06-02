# Performance notes — Jot × Screenpipe

## Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Recall hot-path latency | < 300 ms p95 | Measured at `/recall/evaluate` |
| Idle engine CPU | < 2% | On MacBook Pro M2, 1-min avg |
| Capture-active CPU | < 10% | With vision + audio on |
| Engine RAM | < 120 MB RSS | Steady-state after 30 min capture |
| FTS query time | < 20 ms | SQLite FTS5, local DB |
| Context build time | < 50 ms | `RecallContext::build` (no LLM) |
| SSE delivery | < 5 ms | From `broadcast_send` to Jot IPC |

`last_latency_ms` in `/recall/status` reflects the most recent evaluate cycle (context + FTS + policy, not including network).

## No LLM on hot path

The recall pipeline is intentionally LLM-free:

- Context: window title + app name, resolved by the OS accessibility layer
- Retrieval: SQLite FTS5 with BM25-like ranking across OCR/audio/notes
- Policy: deterministic anchor scoring (same_app, same_document, same_domain, title_overlap)
- Why-now chips: template-based, generated from policy anchor codes

LLM is only in the **Ask** tab (renderer → `POST /search` + manual query), which runs on user demand.

## CPU sampling script (optional)

Sample engine CPU during 10 minutes of capture:

```bash
#!/bin/bash
PID=$(pgrep -f "screenpipe record")
[ -z "$PID" ] && echo "Engine not running" && exit 1
echo "Sampling PID $PID for 600s..."
for i in $(seq 1 60); do
  ps -p "$PID" -o %cpu= | tr -d ' '
  sleep 10
done | awk '{ sum += $1; n++ } END { printf "avg: %.1f%%\n", sum/n }'
```

## DB growth

`recall_events` accumulates one row per evaluate cycle. At 1 switch/minute for 8h/day → ~480 rows/day, ~175k rows/year. SQLite handles this comfortably; no maintenance needed in Year 1.

FTS indices on `ocr_text`, `audio_transcriptions`, and `ui_monitoring` grow with capture. Expect 1–3 GB after 30 days of active capture with vision enabled.

## Notarization

See `jot/docs/release-signing.md` (to be created when Apple credentials are available). Hardened runtime + entitlements for Screen Recording + Accessibility are required for distribution outside the Mac App Store.

## Deferred work (not blocking ship)

- Auto-tune `STRONG_ANCHOR_THRESHOLD` from per-user dismiss rate
- Engine memory pool for FTS BM25 scorer (avoids re-allocating per query)
- Incremental FTS vacuum on low-activity windows
