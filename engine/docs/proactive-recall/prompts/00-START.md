# START — Proactive recall build orchestrator

You are the **build orchestrator** for proactive recall on a **Screenpipe fork**. Run the full pipeline in this session. Use multiple continuations if needed; never stop at stubs or TODOs.

## Prerequisites (verify first)

1. Workspace root has Screenpipe layout: `crates/screenpipe-{events,db,engine,recall}`, `apps/screenpipe-app-tauri`, root `Cargo.toml`.
2. If `crates/` is missing, **STOP** — Screenpipe was not imported; see `PROACTIVE_RECALL.md`.
3. Read `docs/proactive-recall/reference/PRODUCT.md` and `reference/ARCHITECTURE.md`.
4. Open `docs/proactive-recall/CLAUDE_PROGRESS.md` — create/update run state.

## Your job

Execute phases **01 → 10** in strict order. For each phase:

1. Read the phase file: `docs/proactive-recall/prompts/NN-<name>.md`
2. Complete all **exit criteria** in that file
3. Run the phase **verification commands**
4. Update `CLAUDE_PROGRESS.md` (phase checklist, commands, deviations, `current_phase`)
5. Proceed to the next phase **only** if exit criteria pass

Do **not** skip phases. Do **not** declare the project done until `reference/ACCEPTANCE.md` is fully satisfied.

## Phase order

| # | File |
|---|------|
| 01 | `01-preflight-and-discovery.md` |
| 02 | `02-database-migrations.md` |
| 03 | `03-domain-types-and-context.md` |
| 04 | `04-retrieval.md` |
| 05 | `05-policy-and-scoring.md` |
| 06 | `06-recall-service-and-events.md` |
| 07 | `07-server-routes-and-sse.md` |
| 08 | `08-tauri-recall-card.md` |
| 09 | `09-controls-and-modes.md` |
| 10 | `10-tests-docs-and-ship.md` |

## Global rules

- Ship **working code**, not stubs. No placeholder confidence or unused enum variants.
- Layer on existing capture/storage/search/MCP — do not rewrite them.
- No LLM on the hot path. Default to **Silence** when uncertain.
- Prefer direct `screenpipe-db` access over HTTP self-calls.
- Smallest safe diff that meets exit criteria.
- After each phase: `cargo fmt` on touched Rust crates.

## If context runs out

1. Finish the current phase if possible; otherwise note partial state in `CLAUDE_PROGRESS.md`.
2. Set `current_phase` to the **next** incomplete phase.
3. List exact files changed and commands to re-run.
4. Tell the user: re-paste `00-START.md` or the specific phase file with "Continue from phase NN".

## Final output (only after phase 10)

Print a concise summary:

- Phases completed
- Migrations and routes added
- Tests run (with commands)
- Acceptance checklist (all items)
- Known minor issues (if any)

Then stop. Do not ask the user to implement anything you could do yourself.

---

**Begin now:** read `01-preflight-and-discovery.md` and execute phase 01.
