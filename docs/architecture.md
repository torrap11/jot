# Architecture

## Runtime Model

Jot uses the standard Electron security model: a Node.js main process and a sandboxed Chromium renderer with no direct Node access.

```
┌─────────────────────────────────────────────────────────────────┐
│ MAIN PROCESS (Node.js)                                          │
│                                                                 │
│  main.js                                                        │
│  ├── BrowserWindow (320×260, frameless, always-on-top)         │
│  ├── globalShortcut: Cmd+E (toggle), Cmd+Shift+J (voice)       │
│  ├── 22 ipcMain.handle() handlers                              │
│  ├── startScheduler() → 30s reminder poll                      │
│  └── systemPreferences.askForMediaAccess (macOS)               │
│                                                                 │
│  Supporting modules (all main-process only):                    │
│  database.js · llm.js · config.js · voice.js · tts.js          │
│  intentParser.js · triggerEngine.js · scheduler.js             │
│  reminderParser.js · keybinds.js · intelligence/executor.js    │
└──────────────────────┬──────────────────────────────────────────┘
                       │ IPC (contextIsolation: true)
                       │ preload.js — contextBridge → window.api
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ RENDERER (Chromium, sandboxed)                                  │
│  renderer/index.html + renderer.js + style.css                  │
│  — All UI, voice recording, audio playback, state management    │
│  — No direct Node.js or DB access                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Responsibilities

| Module | Responsibility |
|---|---|
| `main.js` | Window lifecycle, global shortcuts, all IPC handler registration, scheduler startup |
| `preload.js` | Context bridge — exposes `window.api` with typed wrappers for every IPC channel |
| `database.js` | SQLite singleton (better-sqlite3, WAL mode). All CRUD. Lazy `getDb()` init with safe migrations |
| `config.js` | Re-reads `userData/config.json` + env vars on every call. Single source for all settings |
| `llm.js` | OpenAI SDK client. `callLLM()` (prose) and `callLLMWithStructuredOutput()` (JSON action array). Multi-pass JSON extraction with fallback |
| `voice.js` | `transcribeAudio(Buffer)` — tries Pulse STT, falls back to Whisper. Returns `{ transcript, words, provider }` |
| `tts.js` | `synthesize(text)` — Lightning TTS → WAV Buffer. `speakSaveConfirmation()`, `speakTriggerReadout()` phrase builders |
| `intentParser.js` | `parseIntent(transcript)` — LLM call → `{ trigger, content, category }`. Falls back to raw transcript if LLM unavailable |
| `triggerEngine.js` | Canonical trigger IDs, labels, icons. `normalizeTrigger(input)` maps free-text to trigger ID |
| `scheduler.js` | 30s `setInterval` poll. `isDue()`, `isStale()`. Fires TTS + sends `reminder-due` IPC to renderer. Initial poll after 5s |
| `reminderParser.js` | Deterministic regex parser: "in X min/hours", "every day at HH:MM", "tomorrow at HH:MM", "at HH:MM". No LLM |
| `keybinds.js` | Exports `{ global, inApp }` arrays. Data only — no logic. Used by agent help handler |
| `intelligence/executor.js` | `executeActions(actions, db)` — dispatches `search`, `create_note`, `create_folder`, `move_note_to_folder`, `organize_into_folders` |
| `renderer/renderer.js` | All UI: note list, editor, voice flow, trigger notifications, reminder notifications, agent panel, folder management, audio playback |

---

## IPC Channel Reference

| Channel | Direction | Handler | Description |
|---|---|---|---|
| `get-notes` | R→M | `db.getAllNotes()` | All notes, ordered by updated_at DESC |
| `create-note` | R→M | `db.createNote(content)` | Returns new note row |
| `update-note` | R→M | `db.updateNote(id, content)` | Returns updated row |
| `delete-note` | R→M | `db.deleteNote(id)` | Hard delete |
| `restore-note` | R→M | `db.restoreNote(note)` | Re-inserts with original id (undo) |
| `create-folder` | R→M | `db.createFolder(name, desc)` | |
| `update-folder` | R→M | `db.updateFolder(id, name, desc)` | |
| `get-folders` | R→M | `db.getAllFolders()` | |
| `update-note-folder` | R→M | `db.updateNoteFolder(noteId, folderId)` | |
| `get-notes-by-folder` | R→M | `db.getNotesByFolder(folderId)` | `null` = unfiled |
| `create-note-from-image` | R→M | `dialog.showOpenDialog` + base64 encode | Returns new note row |
| `transcribe-audio` | R→M | `voice.transcribeAudio(buf)` | `{ transcript, words, provider }` |
| `parse-intent` | R→M | `intentParser.parseIntent(text)` | `{ intent }` |
| `save-intent-memory` | R→M | `db.createIntentMemory` + `tts.speakSaveConfirmation` | `{ memory, audioData }` |
| `simulate-trigger` | R→M | `db.getIntentMemoriesByTrigger` + TTS | `{ trigger, label, icon, memories, audioData }` |
| `get-intent-memories` | R→M | `db.getAllIntentMemories()` | |
| `delete-intent-memory` | R→M | `db.deleteIntentMemory(id)` | |
| `get-config-status` | R→M | `getConfig()` | No secrets — only booleans and provider names |
| `intelligence-query` | R→M | `llm.callLLM()` | Free-form prose (legacy, unused by renderer) |
| `intelligence-query-structured` | R→M | `llm.callLLMWithStructuredOutput()` | JSON action array |
| `intelligence-query-help` | R→M | `llm.callLLM()` with keybinds context | Prose response for shortcut queries |
| `intelligence-execute` | R→M | `executor.executeActions()` | Executes action array against DB |
| `resize-window` | R→M | `win.setBounds()` | 320→600px wide when agent panel opens |
| `create-scheduled-reminder` | R→M | `db.createScheduledReminder()` | |
| `get-scheduled-reminders` | R→M | `db.getAllScheduledReminders()` | |
| `delete-scheduled-reminder` | R→M | `db.deleteScheduledReminder(id)` | |
| `toggle-scheduled-reminder` | R→M | `db.activateReminder / deactivateReminder` | |
| `fire-reminder` | R→M | `scheduler.fireById()` | Manual test — no state change |
| `toggle-voice-capture` | M→R | `renderer: toggleVoiceCapture()` | Sent by Cmd+Shift+J global shortcut |
| `reminder-due` | M→R | `renderer: showReminderNotification()` | Sent by scheduler when reminder fires |

---

## Data Models

### notes
```sql
CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content    TEXT NOT NULL DEFAULT '',
  folder_id  INTEGER REFERENCES folders(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

### folders
```sql
CREATE TABLE folders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
)
```

### intent_memories
```sql
CREATE TABLE intent_memories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  content    TEXT NOT NULL,
  trigger    TEXT NOT NULL DEFAULT 'general',
  category   TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  note_id    INTEGER,
  embedding  TEXT              -- reserved for future semantic search
)
```

### scheduled_reminders
```sql
CREATE TABLE scheduled_reminders (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  content           TEXT NOT NULL,
  schedule_type     TEXT NOT NULL DEFAULT 'once',  -- 'once' | 'daily'
  scheduled_time    TEXT NOT NULL,                 -- ISO string (once) | 'HH:MM' (daily)
  active            INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
)
```

---

## Voice Pipeline

```
User: Cmd+Shift+J
  main.js: sendToggleVoice() → win.webContents.send('toggle-voice-capture')
  renderer: toggleVoiceCapture() → startVoiceRecording()
    navigator.mediaDevices.getUserMedia({ audio: true })
    MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    mediaRecorder.start(100ms timeslice)
    [voiceActive = true, UI: recording state]

User: Cmd+Shift+J again (or Stop button)
  renderer: stopVoiceRecording()
    mediaRecorder.stop() + tracks stopped
    Blob(audioChunks) → ArrayBuffer
    window.api.transcribeAudio(arrayBuffer)
      → IPC → voice.transcribeAudio(Buffer)
        → Pulse STT (Smallest AI): POST audio/webm → { transcription, words }
          ↓ on failure
        → Whisper (OpenAI): write temp file → transcribe → delete temp
      → returns { transcript, words, provider }
    [UI: review state, transcript shown]

User: Save Memory
  renderer: saveVoiceMemory()
    window.api.parseIntent(transcript)
      → IPC → intentParser.parseIntent(text)
        → LLM: INTENT_SYSTEM_PROMPT + transcript
        → JSON parse with fallbacks
        → normalizeTrigger(parsed.trigger)
      → returns { intent: { trigger, content, category } }
    window.api.saveIntentMemory(intent)
      → IPC → db.createIntentMemory() + tts.speakSaveConfirmation()
        → Lightning TTS: POST JSON → WAV bytes
      → returns { memory, audioData }
    playAudioBuffer(audioData)  [Web Audio API]
    loadJots()
    [UI: success state → hidden after 2.5s]
```

---

## Scheduler Flow

```
startScheduler() called at app.whenReady()
  setTimeout(poll, 5000)    — catch missed reminders from last session
  setInterval(poll, 30000)  — recurring check

poll():
  db.getActiveReminders()
  for each reminder:
    if isStale(reminder):    — once-reminder > 1h past due, never fired
      db.deactivateReminder()
    elif isDue(reminder):
      fireReminder(reminder)

fireReminder(reminder):
  db.markReminderTriggered()     — idempotent, prevents double-fire
  if once: db.deactivateReminder()
  tts.synthesize(content) → WAV
  win.webContents.send('reminder-due', { id, content, audioData })
  if !win.isVisible(): win.show(), win.focus()
```

`isDue` logic:
- **once**: `new Date(scheduled_time) <= now && !last_triggered_at`
- **daily**: `currentHHMM() === scheduled_time && !firedToday`

---

## Renderer State

```javascript
// Persistent (localStorage)
currentJotTypeFilter  // 'all' | 'notes' | 'triggers' | 'scheduled'
currentFolderFilter   // 'all' | null (unfiled) | number (folder id)

// Session (in-memory)
currentNote           // note object being edited, or null
currentJotDetail      // { type, data } for trigger/scheduled detail view
notes                 // unified jot list (notes + memories + reminders)
selectedIndex         // cursor in note list
deletedNotesStack     // undo stack (notes only)
folders               // folder list
voiceActive           // recording guard
folderOrganizeOpen    // folder organize view visible

// Session (sessionStorage)
agent chat HTML       // persisted across hot-reloads only
```

---

## Security Notes

- `contextIsolation: true`, `nodeIntegration: false` — renderer has no Node.js access
- All DB, API, and file system calls go through named IPC channels
- `escapeHtml()` used for all user-content rendered via `innerHTML`
- Parameterized SQL everywhere (better-sqlite3 prepared statements)
- API keys never sent to renderer — `get-config-status` returns only booleans
- config.json stored in userData (macOS file system permissions); not encrypted
