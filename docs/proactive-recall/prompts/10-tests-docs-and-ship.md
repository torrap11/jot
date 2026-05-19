# Phase 10 — Tests, docs & ship

## Goal

Meet `reference/ACCEPTANCE.md`; document build/run/dogfood.

## Read first

- `docs/proactive-recall/reference/ACCEPTANCE.md`
- `CLAUDE_PROGRESS.md` — fill acceptance snapshot

## Tasks

### Tests

1. Ensure policy integration tests pass (phase 05).
2. Add second test if missing: **cooldown or app cap** → Silence.
3. Run full matrix:

```bash
cargo fmt
cargo test -p screenpipe-recall -p screenpipe-db -p screenpipe-engine
cd apps/screenpipe-app-tauri/src-tauri && cargo test
# frontend lint/test if fork has them
```

### Docs

1. **`docs/proactive-recall/manual-qa.md`** — step-by-step: start server/app, status curl, app-switch dogfood, surface/silence, dismiss, snooze, never-app, manual trigger, latency visible.
2. **`README.md`** — section **Proactive recall**: what it is, triggers, hot-path constraints, run, manual trigger, curl examples, dogfooding, latency location, per-app opt-out.
3. Update **`CLAUDE_PROGRESS.md`**: all phases checked, acceptance table, commands run.

### Final pass

- Remove dead code, unused enum variants, `todo!()` in recall path
- Confirm every decision persists including Silence
- Confirm hot path avoids internal HTTP to `/search`

## Exit criteria

- [ ] Every item in `reference/ACCEPTANCE.md` checked
- [ ] `manual-qa.md` complete
- [ ] README section complete
- [ ] All required tests green

## Final output

Print implementation summary per `00-START.md` final output section.
