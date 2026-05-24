# PakrAI build progress

**Status:** `beta-ready`  
**Current phase:** P5 (human: TCC + optional notarization)  
**Scope:** [SCOPE.md](./SCOPE.md)  
**Last updated:** 2026-05-24

---

## Phase checklist

| Phase | Name | Status | Exit verified |
|-------|------|--------|---------------|
| — | Legacy 0–4 (Jot × Screenpipe) | ✅ | `docs/claude-code/CLAUDE_PROGRESS.md` |
| P0 | Product identity + keep recording | ✅ | PakrAI strings; engine auto-start |
| P6 | Query screen recordings | ✅ | Recordings tab; search + ask + citations |
| P1 | Time resurfacing | ✅ | `timeParser.js`, `resurfaceScheduler.js`, DB columns |
| P2 | Pakr agent | ✅ | `pakr/`, tab, `pakra:chat`, tools tests |
| P3 | Context intelligence | ✅ | `surfaceEngine` whyNow tags; notes-first switch |
| P4 | Search polish | ✅ | `extractSnippet`, `highlightSnippet`, recents on empty ⌘P |
| P5 | Ship PakrAI | ✅ | v2.1.1 dmg; integration bundled; screen-only (`--disable-audio`) |

---

## Commands log

```text
2026-05-23 — verify — cd jot && npm test — 120/120 pass
2026-05-23 — verify — cargo test -p screenpipe-recall — 21/21 pass
2026-05-23 — fix — preflight uses npm test exit code; notes-only SSE overlay; manual recall notes-first
2026-05-24 — ship — v2.1.1: screen-only engine, Recordings Ask-only, integration/ in repo
```

---

## Files touched (final pass)

```text
jot/scripts/preflight-ship.sh
jot/app-main.js
jot/appWatcher.js
jot/aiOrganize.js
jot/noteCleanup.js
docs/pakrai/manual-qa.md
docs/pakrai/PAKRAI_PROGRESS.md
docs/pakrai/PHASES.md
docs/STATUS.md
```

---

## Deviations

```text
- P4 pinned notes: deferred (recents on empty search only)
- P5 notarization: requires APPLE_ID / team credentials (warn in preflight)
- Proactive overlay: recall SSE surface events ignored; notes via surfaceEngine; manual recall tries notes then capture
```

---

## Blockers (human-only)

- [ ] macOS TCC: Screen Recording, Automation, Accessibility for PakrAI.app
- [ ] Optional: `build/icon.icns` + notarized release

---

## Run

```bash
cd screenpipe-x-jot
./scripts/run-dev.sh
```

QA: [manual-qa.md](./manual-qa.md)
