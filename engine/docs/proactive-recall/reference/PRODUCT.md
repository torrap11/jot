# Product — proactive recall (v1)

## Equation

**proactive recall = right memory × right moment × fast enough × often silent × user still in control**

## Definition

On a strong context transition (primarily **app switch**), the system builds local context from Screenpipe data, retrieves prior episodes via SQLite/FTS, evaluates policy, and either shows a **small calm card** or stays **silent**.

## This is NOT

- Chat / assistant UI
- Daily summary
- New capture pipeline
- Cloud / sync
- LLM on the hot path
- Rewrite of `/search` or MCP

## Triggers (v1 only)

- `AppSwitch` — wait **300 ms** settle after switch
- `Manual` — user-initiated; bypasses auto cooldowns/caps and meeting/focus suppression

## Tri-state policy

| Action | Meaning |
|--------|---------|
| `Surface` | Show card (strong evidence + gates pass) |
| `Defer` | Keep candidate for recheck on next eligible trigger |
| `Silence` | No UI; log decision |

Default: **Silence** when uncertain.

## Hard constraints

- Local-first; no cloud
- No LLM in hot path
- Persist **every** decision including Silence
- Hot path target: **< 500 ms** total (warm DB)
- macOS-first UX; do not break Win/Linux compile
- One card visible; no sound; non-modal

## Architecture (target)

```
screenpipe-events (AppSwitch / Manual)
  → screenpipe-recall (context, retrieval, policy)
  → screenpipe-db (FTS + recall_events)
  → screenpipe-engine (routes, SSE)
  → screenpipe-app-tauri (card UI)
```

Direct DB access in server hot path — **no HTTP self-calls** to `/search`.
