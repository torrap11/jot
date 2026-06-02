# Claude Code — Jot monorepo

## Build this product

Run the PRD pipeline: **`docs/workspace/claude-code/00-START.md`** (read **`docs/PRD.md`** first).

## Permissions (do not ask the human)

This workspace is configured for **autonomous builds**:

- Project **`.claude/settings.local.json`** sets `defaultMode`: **`bypassPermissions`** — do not stop for Bash/Edit approval prompts.
- If prompts still appear, the human should restart with: 
 `claude --dangerously-skip-permissions` 
 from this directory (`jot/` repo root).
- **Never** ask the user to click “Allow” for routine `cargo`, `npm`, `bun`, `curl`, `git status`, or file edits in this repo.
- **Do** still ask the human for: macOS Screen Recording / Accessibility / Automation (TCC) — those cannot be granted by Claude.

## Repo layout

| Path | Role |
|------|------|
| `/` (repo root) | Jot Electron app — notes, overlay, Jot AI |
| `engine/` | Screenpipe + proactive recall (Rust, `:3030`) |
| `integration/` | Sidecar manager + API clients |

Single GitHub repo: **[github.com/parthha12/jot](https://github.com/parthha12/jot)**

The former **`proactive-recall`** repo is merged into `engine/`. Do not clone it separately.

## Global rules

- No `git reset`; no force-push to main.
- No LLM on proactive recall hot path.
- Ship working code, not stubs.

## Dev commands

```bash
./scripts/setup-workspace.sh   # one-time
./scripts/build-engine.sh      # Rust engine → engine/target/release/screenpipe
./scripts/run-dev.sh           # start Jot
./scripts/verify-stack.sh      # automated smoke
```
