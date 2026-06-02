# Continue build — paste into Claude Code

Phase 0 ✅ | Phase 1 ✅ (engine builds; recall API smoke-tested) | **Start Phase 2**

```markdown
Read PRD.md and docs/claude-code/CLAUDE_PROGRESS.md.

Phase 0 and Phase 1 are complete:
- engine/target/release/screenpipe exists (build via ./scripts/build-engine.sh)
- /recall/status and /recall/evaluate work with SCREENPIPE_API_KEY
- integration/engineManager.js spawns `screenpipe record`
- Do not re-implement Phase 1 unless tests fail

Execute docs/claude-code/03-phase-2-jot-resurfacing.md fully:
- App switch → 300ms settle → POST /recall/evaluate
- One overlay card, why-now chips, dismiss/snooze/never-app via /recall/action
- Disable legacy pickSurfacedNotes by default (JOT_LEGACY_SURFACE=false)
- npm test in jot/

Update CLAUDE_PROGRESS.md when done. bypassPermissions — do not ask me to approve cargo/npm.
```

## Human checklist (before dogfood)

1. `export SCREENPIPE_API_KEY=$(./engine/target/release/screenpipe auth token)`
2. Grant **Accessibility** + **Screen Recording** in System Settings (for real capture + app_switch)
3. `cd . && npm start`
