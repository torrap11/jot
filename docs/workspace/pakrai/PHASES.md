# PakrAI — implementation phases

**Status:** Implemented in `jot/` (beta-ready). QA: [manual-qa.md](./manual-qa.md)

---

## P0 — Identity + keep recording ✅

- [x] PakrAI / Pakr strings
- [x] Engine auto-start; Screen Recording in onboarding
- [x] Recording / engine health indicator

---

## P6 — Query recordings ✅

- [x] Recordings tab with Search + Ask modes
- [x] Offline engine copy
- [x] Ask citations (timestamp, app, snippet)
- [x] [manual-qa.md](./manual-qa.md)

---

## P1 — Time resurfacing ✅

- [x] `timeParser.js`, `resurface_at`, `resurfaceScheduler.js`

---

## P2 — Pakr agent ✅

- [x] Pakr tab, `pakra:chat`, `pakrTools` tests

---

## P3 — Context intelligence ✅

- [x] `surfaceEngine` whyNow; notes-first on app switch

---

## P4 — Search polish ✅

- [x] Snippet + highlight; recents when ⌘P empty
- [ ] Pinned notes (deferred)

---

## P5 — Ship 🟡

- [x] Engine in `extraResources`
- [x] `npm run preflight`
- [ ] Custom `build/icon.icns` (optional)
- [ ] Notarized dmg (requires Apple credentials)

---

## Verify

```bash
./scripts/verify-stack.sh
cd . && npm test && npm run preflight
./scripts/run-dev.sh
```
