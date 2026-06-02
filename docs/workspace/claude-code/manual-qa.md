# Manual QA — Jot × Screenpipe proactive recall

Run after Phases 0–4 are complete.

## Setup (run once before QA)

```bash
cd /Users/parthharish/Documents/github-real/screenpipe-x-jot
chmod +x scripts/prepare-manual-qa.sh
export SCREENPIPE_API_KEY=dev-key-123
./scripts/prepare-manual-qa.sh
./scripts/run-dev.sh
```

**macOS permissions** (System Settings → Privacy & Security):

- **Screen Recording** — enable **Electron** (Jot) and allow **screenpipe** / **Terminal** when prompted
- **Accessibility** — **Electron** (app-switch / UI capture)

Confirm **Engine → Status**: Recall API available, `Focus mode: false`, `Meeting mode: false`.  
Health should show `frame_status: ok` (not `disabled`) after prep script.

---

## Phase 2 checklist

### 2-A: Rapid app switch — mostly silent

1. Switch between 5+ apps in quick succession (< 300 ms apart).
2. **Expected**: overlay does NOT fire for each switch; at most one card appears after a pause.
3. **Verify**: Console log shows `[recallWatcher] silence` or `[recallWatcher] defer` for most switches.

### 2-B: Strong same-document context — one card with chips

1. Open a document in any app (e.g. a PDF, Notion page, browser tab).
2. Switch to Jot and capture a note about that document.
3. Switch back to the same app/document.
4. **Expected**: overlay shows **exactly one** card with:
   - Title from the window/document name
   - At least one why-now chip (e.g. "same document", "same app")
   - Buttons: **Dismiss**, **Snooze 30m**, **Never App**

### 2-C: Dismiss — no resurface during cooldown

1. Surface a recall card (via 2-B or ⌘⇧R).
2. Click **Dismiss**.
3. Switch away and back to the same app within 20 minutes.
4. **Expected**: overlay does NOT reappear (engine cooldown in effect).

### 2-D: Snooze — resurface after 30 min

1. Surface a recall card.
2. Click **Snooze 30m**.
3. **Expected**: overlay hides; after 30 minutes the card re-evaluates on next app switch.

### 2-E: Never App — permanent opt-out for this app

1. Surface a recall card.
2. Click **Never App**.
3. Switch to and from the same app multiple times over the next hour.
4. **Expected**: overlay never appears for this app context again.

### 2-F: Manual recall — ⌘⇧R

1. Press **⌘⇧R** (Command+Shift+R) from any app.
2. **Expected**: overlay surfaces a recall card (or console logs "silence" if no candidate).
3. Manual recall must work even when focus/meeting mode would block auto-recall.

### 2-G: Keyboard shortcuts on recall card

1. Surface a recall card (2-B or ⌘⇧R).
2. Press **S** → card dismisses + snooze posted.
3. Surface again, press **Esc** → card dismisses + dismiss posted.

### 2-H: Legacy surface off by default

1. Without setting `JOT_LEGACY_SURFACE=true`, switch apps with recall engine stopped.
2. **Expected**: overlay does not fire (no legacy note surface).
3. Restart with `JOT_LEGACY_SURFACE=true` and engine stopped → legacy surface works.

### 2-I: Existing note CRUD not broken

1. Create, edit, and delete a note.
2. Search for notes.
3. **Expected**: all note operations work normally; no regressions.

---

## Phase 3 checklist

Run after Phase 3 is complete. Engine running with `SCREENPIPE_API_KEY` set.

### 3-A: Engine status badge

1. Start Jot with engine running.
2. Open the Notes window; look for the status dot in the tab bar.
3. **Expected**: dot is green ("recording") within 12 s of startup.
4. Stop the engine (`kill $(pgrep screenpipe)`).
5. **Expected**: dot turns grey ("offline") within 24 s (two poll cycles).

### 3-B: Rewind tab — text search

1. Click the **Rewind** tab.
2. Type a word you know has appeared on screen (e.g. "Safari").
3. Click **Search** or press Enter.
4. **Expected**: results appear as capture cards with source badge (screen/audio) and timestamp.

### 3-C: Rewind tab — content-type filter

1. Run a search as in 3-B.
2. Click the **screen** chip to filter to OCR only.
3. **Expected**: only screen-capture cards remain; audio cards disappear.

### 3-D: Ask tab — blended note + memory results

1. Click the **Ask** tab.
2. Type a topic you have both a Jot note and Screenpipe memory about.
3. Click **Ask**.
4. **Expected**: results include cards with a **note** badge (from Jot DB) and cards with a **memory** badge (from Screenpipe), interleaved.

### 3-E: Bundled binary path

1. Run `npm run dist` (or `electron-builder --mac --dir`).
2. Inspect `jot/dist/mac-arm64/Jot.app/Contents/Resources/`.
3. **Expected**: `screenpipe` binary is present and executable (`ls -lh`).

---

## Phase 4 checklist

Run after Phase 4 is complete.

### 4-A: Focus Mode — suppresses auto-recall

1. Start Jot with engine running.
2. Enable Focus Mode: **Engine → Focus Mode: OFF** (toggles to ON).
3. Switch between apps repeatedly.
4. **Expected**: recall overlay does NOT appear automatically.
5. Press **⌘⇧R** — manual recall still surfaces a card (if context available).
6. Disable Focus Mode; switch apps — auto-recall resumes.

### 4-B: Meeting Mode — auto-silence during video call

1. Start a Zoom/Meet/Teams call.
2. Watch the Engine → Status dialog.
3. **Expected**: `meeting_mode: true` appears, and auto-recall is silenced while the call is active.
4. End the call; **Expected**: `meeting_mode` returns to `false` within 30 s.

### 4-C: Defer — resurfacing on stronger context

1. Allow a recall card to be deferred (policy returns "Defer", not Surface).
2. Switch to the same app again with more document context.
3. **Expected**: a second evaluate fires; if anchors are stronger the card surfaces this time.
4. Alternatively: check `/recall/status` shows `pending_deferred > 0` after a defer.

### 4-D: Debug status dialog — full fields

1. Open **Engine → Status**.
2. **Expected**: dialog shows all of: enabled, focus_mode, meeting_mode, last_context_app, last_decision, latency_ms, surfaces_today.
3. With engine offline: dialog degrades gracefully (shows "Engine offline").

### 4-E: Manual recall — always available

1. Enable Focus Mode.
2. Press **⌘⇧R**.
3. **Expected**: recall card surfaces (or console logs "silence") — manual bypass works even in focus mode.

### 4-F: Never-App persistence across restarts

1. Surface a recall card for App X; click **Never App**.
2. Quit and restart Jot + engine.
3. Switch to App X.
4. **Expected**: overlay never appears for App X (preference persisted in `recall_app_preferences`).

### 4-G: Regression — full note CRUD + recall coexist

1. Create, edit, delete a note.
2. Verify search still returns correct results.
3. Switch apps to trigger recall; verify Rewind tab and Ask tab still work.
4. **Expected**: no regressions; all four surfaces (notes, recall overlay, rewind, ask) functional.
