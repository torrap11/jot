# Proactive recall — Claude Code prompt pipeline

Sequential prompts to build proactive recall on **this repo** (Screenpipe + recall docs). Full research: [`../proactive-recall.md`](../proactive-recall.md).

## One prompt to start everything

Paste **only** this file into Claude Code at the **repo root**:

```
docs/proactive-recall/prompts/00-START.md
```

The orchestrator runs phases `01` → `10` in order, updates [`CLAUDE_PROGRESS.md`](./CLAUDE_PROGRESS.md) after each phase, and stops only when acceptance criteria pass or it documents a blocker.

## If a session ends early

1. Open [`CLAUDE_PROGRESS.md`](./CLAUDE_PROGRESS.md) — note `current_phase` and blockers.
2. Paste `00-START.md` again, or paste the specific phase file (e.g. `06-server-routes-and-sse.md`) with: *Continue from phase 06; read CLAUDE_PROGRESS.md first.*

## Folder layout

| Path | Purpose |
|------|---------|
| `prompts/00-START.md` | **Entry point** — orchestrates all phases |
| `prompts/01-…` through `10-…` | One feature slice per session |
| `reference/` | Stable spec (schema, API, policy) — do not duplicate in prompts |
| `CLAUDE_PROGRESS.md` | Agent-maintained run log |
| `manual-qa.md` | Created in phase 10 |

## Prerequisites

- This repo includes upstream Screenpipe (`screenpipe-upstream` remote), `crates/screenpipe-engine`, and stub `crates/screenpipe-recall`
- Run `./scripts/setup-dev.sh` once (JS + Rust smoke check; fixes Tailwind IDE errors)
- macOS dev environment for dogfooding (Windows/Linux: compile-safe OK)
- Root `cargo` workspace **excludes** `apps/screenpipe-app-tauri/src-tauri` — run tests in both places

## Phase map

| Phase | Delivers |
|-------|----------|
| 01 | Repo discovery, schema report, progress file |
| 02 | SQLite migrations + recall DB types |
| 03 | `screenpipe-recall` types, context build, tokenizer |
| 04 | Retrieval + candidate normalization |
| 05 | Policy, scoring, defer, policy tests |
| 06 | Recall service + event subscription |
| 07 | REST routes + SSE |
| 08 | Tauri recall card + actions |
| 09 | Manual trigger, focus toggle, meeting heuristics |
| 10 | Integration tests, README, manual QA, final build |
