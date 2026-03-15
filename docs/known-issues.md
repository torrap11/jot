# Known Issues

Bugs are numbered for reference in commit messages and PRs. Severity: Critical / High / Medium / Low.

---

## Open Bugs

### BUG-1 — Delete key calls wrong IPC for trigger/scheduled jots
**Severity**: High
**File**: `renderer/renderer.js:454`

```javascript
// current (wrong):
await window.api.deleteNote(note.id);

// note.jotType may be 'trigger' or 'scheduled'
// deleteNote targets the notes table — ID won't match, silent no-op
// undo stack also receives a corrupt entry
```

**Fix**: Check `note.jotType` before dispatching:
- `'trigger'` → `window.api.deleteIntentMemory(note.id)`
- `'scheduled'` → `window.api.deleteScheduledReminder(note.id)`
- `'note'` → `window.api.deleteNote(note.id)`

---

### BUG-2 — Enter key opens trigger/scheduled jots in text editor
**Severity**: High
**File**: `renderer/renderer.js:449`

```javascript
// current (wrong):
openNote(notes[selectedIndex]);   // always calls openNote

// for jotType 'trigger' or 'scheduled', should call:
openJotDetail(jot.jotType, jot);
```

When a trigger jot is opened as a note, pressing Back calls `deleteNote(jot.id)` (no-op on notes table) and also runs `parseIntent` on the trigger content, potentially creating a duplicate intent memory.

---

### BUG-3 — Race condition in `showList()` during LLM call
**Severity**: Medium
**File**: `renderer/renderer.js:313`

`showList()` calls `window.api.parseIntent()` which takes ~1-3s. If the user creates a new note (clicks +) before the LLM responds, `currentNote` is set to the new note. When `showList()` resumes, line 353 sets `currentNote = null`, orphaning the new note reference and breaking autosave.

**Fix**: Capture `currentNote` in a local variable at the start of `showList()`. Add an in-progress guard to prevent concurrent invocations.

---

### BUG-4 — Duplicate `formatScheduleLabel` function
**Severity**: Low
**File**: `renderer/renderer.js:204` and `renderer/renderer.js:1378`

Two identical functions with the same name. The second silently shadows the first. No runtime impact currently, but the duplication will cause confusion if they diverge.

**Fix**: Remove one definition. Both implementations are identical.

---

### BUG-5 — Daily reminders can double-fire in non-UTC timezones
**Severity**: Medium
**File**: `scheduler.js:48`

`markReminderTriggered` stores `datetime('now')` which is UTC in SQLite. The "already fired today" check compares `last_triggered_at.substring(0, 10)` (UTC date) against `todayDateStr()` (local date). For users west of UTC, a reminder fired at 11 PM local time records `next-day` in UTC — the check sees it as "not fired today" and fires again.

**Fix**: Store and compare timestamps consistently. Either convert `todayDateStr()` to UTC, or store `last_triggered_at` in local time.

---

### BUG-6 — No size limit on image notes
**Severity**: Medium
**File**: `renderer/renderer.js:403`, `main.js:157`

Images are base64-encoded and stored in the SQLite `content` column with no size check. A 10MB image becomes ~13MB of base64 text. Many large images will bloat the database and slow note-list loads.

**Fix**: Reject images larger than 2MB before encoding. Show an error message.

---

### BUG-7 — Back button not disabled during async `showList()`
**Severity**: Low
**File**: `renderer/renderer.js:385`

Double-clicking Back triggers two concurrent `showList()` calls. Both read the same `currentNote` reference and may attempt `createScheduledReminder` or `saveIntentMemory` twice, creating duplicate entries.

**Fix**: Set `backBtn.disabled = true` at the start of `showList()` and restore it at the end.

---

### BUG-8 — `normalizeTrigger` partial match fires on common words
**Severity**: Medium
**File**: `triggerEngine.js:59`

```javascript
const root = id.split('_')[0];   // 'work', 'netflix', 'linkedin', 'gmail', 'general'
if (s.includes(root)) return id;
```

Any string containing "work" (e.g., "homework", "working") maps to `work_start`. Intent memories and trigger matches are incorrect.

**Fix**: Use word-boundary regex instead of `includes()`:
```javascript
if (new RegExp(`\\b${root}\\b`, 'i').test(s)) return id;
```

---

### BUG-9 — Agent request has no timeout
**Severity**: Low
**File**: `renderer/renderer.js:625`

If the OpenAI API hangs, the "Thinking…" bubble stays forever and the input remains disabled. There is no timeout or abort mechanism.

**Fix**: Add a 30-second `AbortController` timeout to the agent request. Restore UI state on timeout with an error message.

---

### BUG-10 — `app.dock.hide()` called before `app.ready`
**Severity**: Low
**File**: `main.js:306`

```javascript
if (app.dock) app.dock.hide();  // module-level, before app.whenReady()
```

Electron docs recommend calling `app.dock` methods after the app is ready. Works on current Electron but is technically incorrect.

**Fix**: Move into `app.whenReady().then(...)`.

---

### BUG-11 — `intelligence-query` IPC handler registered but never called
**Severity**: Low
**File**: `main.js:109`

`ipcMain.handle('intelligence-query', ...)` is registered but the renderer uses `intelligence-query-structured` and `intelligence-query-help` exclusively. Dead code.

**Fix**: Remove the handler and the corresponding `intelligenceQuery` method from `preload.js`.

---

### BUG-12 — `_cached` variable declared but never used in `config.js`
**Severity**: Low
**File**: `config.js:27`

```javascript
let _cached = null;  // never read or written
```

**Fix**: Remove it.

---

## Design Limitations (not bugs, but worth tracking)

| Limitation | Notes |
|---|---|
| No undo for intent memories or scheduled reminders | Undo stack covers notes only |
| `embedding` column in `intent_memories` populated but unused | Reserved for semantic search (M5) |
| Trigger IDs are hardcoded | Adding a trigger requires code changes in 3 places |
| reminderParser logic duplicated in main and renderer | `reminderParser.js` and `parseReminderNLClient()` in renderer.js must be kept in sync manually |
| No tests | Zero test coverage across all modules |
| macOS-only shortcuts | `Cmd+` shortcuts don't map for Windows/Linux |
| Single window | No multi-window support |
| No config encryption | `config.json` stores API keys in plain text |
