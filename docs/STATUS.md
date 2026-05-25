# Project status — 2026-05-25

## Jot (product)

| Check | Result |
|-------|--------|
| Spec | `docs/jot/` |
| `npm test` (jot) | 30/30 |
| Progress | `docs/jot/JOT_PROGRESS.md` → **beta-ready** |
| Manual QA | `docs/jot/manual-qa.md` |

### Run

```bash
cd jot
npm install
npm start
```

### Human-only

- macOS TCC for Jot (Automation, Accessibility)
- Screen Recording engine: 🚧 under construction
- Optional: notarization + `build/icon.icns`

---

## Legacy stack

| Check | Result |
|-------|--------|
| `screenpipe` binary | `proactive-recall/target/release/screenpipe` |
| Scripts | `run-dev.sh`, `verify-stack.sh`, `build-engine.sh` |
