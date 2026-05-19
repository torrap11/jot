# Claude Code progress — proactive recall

> **Agent:** Update this file after every phase. Humans use it to resume.

## Run state

| Field | Value |
|-------|--------|
| `current_phase` | `not_started` |
| `last_completed_phase` | none |
| `fork_repo` | _fill: path or remote URL_ |
| `screenpipe_commit` | _fill: `git rev-parse HEAD`_ |
| `blocked` | false |
| `blocker` | none |

## Phase checklist

- [ ] 01 — Preflight & discovery
- [ ] 02 — Database migrations
- [ ] 03 — Domain types & context
- [ ] 04 — Retrieval
- [ ] 05 — Policy & scoring
- [ ] 06 — Service & events
- [ ] 07 — Server routes & SSE
- [ ] 08 — Tauri recall card
- [ ] 09 — Controls (manual, focus, meeting)
- [ ] 10 — Tests, docs, final verification

## Schema notes (from phase 01)

_Fill after inspecting `screenpipe-db`: actual table/column names for frames, frames_fts, ui_events, app-switch fields._

## Deviations from reference spec

_List any rename, missing column, or architectural compromise._

## Commands run (latest session)

```text
(paste commands and pass/fail)
```

## What remains

_Bullet list for the next session._

## Acceptance criteria snapshot

_Short yes/no per item from `reference/ACCEPTANCE.md` — update in phase 10._
