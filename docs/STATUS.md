# Project status — 2026-05-25

## Jot (product)

| Check | Result |
|-------|--------|
| Spec | `docs/` |
| `npm test` (jot) | 30/30 |
| Progress | `docs/JOT_PROGRESS.md` → **beta-ready** |
| Manual QA | `docs/manual-qa.md` |

### Run

```bash
cd .
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
| `screenpipe` binary | `engine/target/release/screenpipe` |
| Scripts | `run-dev.sh`, `verify-stack.sh`, `build-engine.sh` |
