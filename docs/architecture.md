# Architecture

## Product equation

```text
proactive recall = right memory × right moment × fast enough × often silent × user in control
```

If any factor is zero, the experience fails—even with perfect capture.

## System flow

```text
capture → episodic store → retrieval → policy → intervention
              ↑                ↑          ↑
         right memory      fast enough   often silent
                              ↑          ↑
                         right moment   user in control
```

**Screenpipe** (upstream): capture + SQLite + `/search` on `localhost:3030` → **right memory** (data) + **fast enough** (FTS).

**Proactive recall** (this project): context + policy + intervention specs → **right moment**, **often silent**, **user in control**.

## Implementation mapping

| Factor | Component |
|--------|-----------|
| Right memory | Episodic store, entity linking, retrieval quality |
| Right moment | Event triggers, context snapshot, calendar hooks |
| Fast enough | Narrow `/search`, prefetch on app switch, no LLM in hot path |
| Often silent | `RecallPolicy` thresholds, cooldown, defer |
| User in control | Dismiss/snooze state, permissions, explain string |

## Integration (Screenpipe)

- Read episodes via REST or `screenpipe-db`
- Triggers: app switch, calendar, optional live audio (opt-in)
- Do not duplicate capture / OCR / Whisper in v1
