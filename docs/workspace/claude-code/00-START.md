# START — Jot × Screenpipe (PRD build orchestrator)

You are the **build orchestrator** for the unified product defined in **`PRD.md`** at the workspace root (`screenpipe-x-jot/`). Your job is to read the PRD, execute phases **0 → 4** in strict order, and ship **working code** — not stubs, not “TODO: wire later.”

Use multiple continuations if needed. Never use `git reset` or delete others’ work.

---

## Permissions — autonomous mode (mandatory)

**Do not ask the human to approve routine tool use.** This build requires hundreds of `cargo`, `npm`, `bun`, and file edits.

1. Assume **`defaultMode`: `bypassPermissions`** via `.claude/settings.local.json` in the workspace root.
2. If you still hit approval prompts, tell the human to restart:  
   `cd screenpipe-x-jot && claude --dangerously-skip-permissions`  
   then re-paste this file.
3. Never wait for “Allow” on: `cargo build/test/fmt`, `npm test`, `bun install`, `curl localhost:3030`, edits under `engine/`, `jot/`, `integration/`.
4. **Do** ask the human only for macOS TCC (Screen Recording, etc.) — see `docs/claude-code/AUTONOMOUS.md`.

Full guide: **`docs/claude-code/AUTONOMOUS.md`**

---

## Step 0 — Read before coding (mandatory)

Read these in full before phase 0:

1. **`PRD.md`** — goals, requirements, phases, architecture, non-goals
2. **`docs/claude-code/CLAUDE_PROGRESS.md`** — create/update run state
3. **`engine/docs/engine/reference/PRODUCT.md`**
4. **`engine/docs/engine/reference/POLICY.md`**
5. **`engine/docs/engine/reference/ACCEPTANCE.md`**
6. **`jot/docs/jot-overview.md`**

Skim: `engine/docs/engine/reference/{API,ARCHITECTURE,SCHEMA}.md`

**Locked decisions** (do not re-litigate; document in progress file if you deviate):

- Policy lives in **Rust** (`screenpipe-recall`); Jot is an HTTP/SSE client
- **Dual DB** in v1; merge note candidates in retrieval layer
- **Jot** is the product shell; do not require Screenpipe Tauri for daily use after phase 3
- **No LLM** on proactive hot path; default **Silence** when uncertain

---

## Step 1 — Verify workspace

Confirm layout exists:

```text
screenpipe-x-jot/
  PRD.md
  engine/     # Screenpipe fork (crates/, apps/)
  jot/                  # Electron app
  integration/          # glue (may be empty — you create it)
```

If `engine/crates/screenpipe-engine` is missing → **STOP**; read `engine/PROACTIVE_RECALL.md` and report setup failure.

---

## Step 2 — Execute phases in order

For each phase file in `docs/claude-code/`:

| # | File |
|---|------|
| 0 | `01-phase-0-foundation.md` |
| 1 | `02-phase-1-recall-backend.md` |
| 2 | `03-phase-2-jot-resurfacing.md` |
| 3 | `04-phase-3-memory-ux.md` |
| 4 | `05-phase-4-polish-ship.md` |

**Per phase:**

1. Read the phase file completely
2. Implement all tasks and meet **exit criteria**
3. Run **verification commands** (fix failures before proceeding)
4. Update `CLAUDE_PROGRESS.md` (checklist, commands, files, `current_phase`, deviations)
5. Proceed **only** when exit criteria pass

Do **not** skip phases. Do **not** mark the PRD build done until phase 4 exit criteria pass (or document explicit deferrals in progress file).

---

## Global engineering rules

### Repos

| Path | Change when |
|------|-------------|
| `engine/` | Engine, recall crate, DB migrations, `/recall/*` |
| `jot/` | Electron UI, overlay, IPC, notes (keep existing behavior unless PRD supersedes) |
| `integration/` | Sidecar lifecycle, API client, shared types — **prefer here** for cross-repo glue |
| `docs/claude-code/` | Progress + build docs only |

### Screenpipe fork

- Layer on existing capture, FTS, search, MCP — **do not rewrite**
- Hot path: `screenpipe-events` → `screenpipe-recall` → `screenpipe-db` (direct DB, **no HTTP self-calls**)
- For recall backend detail, follow `engine/docs/engine/prompts/01`–`07` inside phase 1

### Jot

- Use `npm` / existing Jot scripts (`npm test`, `npm start`)
- File header on new/edited `.js` files (see `jot` repo conventions if present; else screenpipe header from workspace rules)
- Replace `surfaceEngine.js` “show up to 3” behavior in phase 2, not before recall API works

### Quality

- Smallest safe diff that meets exit criteria
- `cargo fmt` on touched Rust; `cargo test -p screenpipe-recall` when recall changes
- `npm test` in `jot/` when Jot changes
- No hardcoded secrets; local API key from env / Jot userData pattern

### macOS

- You cannot fully verify TCC in CI; write `docs/claude-code/manual-qa.md` with human steps
- Document dev setup in workspace `README.md` when phase 0 completes

---

## If context runs out

1. Finish current phase if possible; else note partial state in `CLAUDE_PROGRESS.md`
2. Set `current_phase` to the **next incomplete** phase number
3. List files changed + exact commands to re-run
4. Tell the user: re-paste **`docs/claude-code/00-START.md`** or the specific phase file with *“Continue from phase N”*

---

## Final output (only after phase 4)

Print:

- Phases completed (0–4)
- PRD goals G1–G6 — met / partial / deferred
- Key routes and Jot entry points
- Tests run (with commands)
- `ACCEPTANCE.md` checklist status
- How to run dev: engine + Jot
- Known issues + manual QA path

Then stop. Do not ask the user to implement what you could do yourself.

---

**Begin now:** open `01-phase-0-foundation.md` and execute phase 0.
