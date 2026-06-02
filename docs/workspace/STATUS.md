# Project status — 2026-05-23

## PakrAI (product)

| Check | Result |
|-------|--------|
| Spec | `docs/pakrai/` |
| `npm test` (jot) | 120/120 |
| `cargo test -p screenpipe-recall` | 21/21 |
| Progress | `docs/pakrai/PAKRAI_PROGRESS.md` → **beta-ready** |
| Manual QA | `docs/pakrai/manual-qa.md` |

### Run

```bash
cd screenpipe-x-jot
./scripts/run-dev.sh
```

### Human-only

- macOS TCC for PakrAI (Screen Recording, Automation, Accessibility)
- Optional: notarization + `build/icon.icns`

---

## Legacy stack

| Check | Result |
|-------|--------|
| `screenpipe` binary | `engine/target/release/screenpipe` |
| Scripts | `run-dev.sh`, `verify-stack.sh`, `build-engine.sh` |
| Claude Code phases 0–4 | `docs/claude-code/CLAUDE_PROGRESS.md` |
