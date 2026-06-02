# Phase 2 — Jot resurfacing alignment

**PRD ref:** §11 Phase 2, §7.4 U1–U6, §6.4  
**Goal:** App switch drives `/recall/evaluate`; overlay shows **at most one** policy-approved card with why-now and actions.

---

## Read first

- `jot/surfaceEngine.js`, `jot/app-main.js`, `jot/appWatcher.js`, `jot/overlay/`
- `engine/docs/engine/reference/POLICY.md`
- `integration/recallClient.js`

---

## Tasks

### 1. App switch → evaluate (not pickSurfacedNotes)

In `appWatcher` / `startWatcher`:

- On frontmost app change (ignore Jot’s own bundle): wait **300 ms** settle (debounce)
- Call `recallClient.evaluate({ trigger: 'app_switch', dryRun: false })`  
  _(Use API’s actual trigger enum — map from `AppSwitch` if needed)_
- If decision.action === `Surface` and candidate present → show overlay
- If `Defer` or `Silence` → do not show overlay; log decision id for debug

Remove or gate old path: `surface.pickSurfacedNotes` → **off by default** behind `JOT_LEGACY_SURFACE=false`.

### 2. Overlay — one card

- Show **one** card (not 3): title/snippet from candidate (note or frame excerpt)
- Render **why-now** chips from `decision.why_now` / `reason_list` (no LLM copy)
- Controls: **Dismiss**, **Snooze** (30 min default), **Never this app** → `POST /recall/action`
- Keep existing snooze/dismiss UX patterns where they fit Jot styling

### 3. Manual recall

- Global shortcut (e.g. ⌘⇧R or reuse PRD “manual recall”) → `evaluate({ trigger: 'manual' })`
- Must work when meeting/focus would block **auto** (verify with dry-run + live tests)

### 4. Note + capture candidates

Ensure phase 1 note federation still works: switching to linked app can surface a **Jot note** or **screen episode** per policy.

### 5. Tests

- `jot/tests/`: watcher debounce unit test; mock `recallClient` → Surface shows overlay path / Silence hides
- Do not break existing note CRUD tests

### 6. `docs/claude-code/manual-qa.md`

Human checklist:

- Rapid app switch → mostly silent
- Strong same-document context → one card with chips
- Dismiss → no resurface for cooldown period
- Manual recall during “meeting” app

---

## Exit criteria

- [ ] 300 ms settle implemented
- [ ] Auto path uses recall API only (legacy surface disabled by default)
- [ ] Max **1** card on Surface
- [ ] why-now visible; actions persist via `/recall/action`
- [ ] Manual recall shortcut works
- [ ] `npm test` passes in `jot/`
- [ ] `manual-qa.md` exists

---

## Verification

```bash
cd . && npm test && npm start
# Human: follow manual-qa.md
```

---

## Do not

- Build full Search/Rewind/Ask UI (phase 3)
- Add LLM to why-now strings
- Re-enable “always 3 linked notes” without explicit feature flag

---

## On completion

Update `CLAUDE_PROGRESS.md` → phase 2 ✅, proceed to `04-phase-3-memory-ux.md`.
