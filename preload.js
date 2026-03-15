const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ── Notes ──────────────────────────────────────────────────────────────
  getNotes:         ()               => ipcRenderer.invoke('get-notes'),
  createNote:       (content)        => ipcRenderer.invoke('create-note', content),
  createNoteFromImage: ()            => ipcRenderer.invoke('create-note-from-image'),
  updateNote:       (id, content)    => ipcRenderer.invoke('update-note', id, content),
  deleteNote:       (id)             => ipcRenderer.invoke('delete-note', id),
  restoreNote:      (note)           => ipcRenderer.invoke('restore-note', note),

  // ── Window ─────────────────────────────────────────────────────────────
  resizeWindow:     (panelOpen)      => ipcRenderer.invoke('resize-window', panelOpen),

  // ── Folders ────────────────────────────────────────────────────────────
  createFolder:     (name, desc)     => ipcRenderer.invoke('create-folder', name, desc),
  updateFolder:     (id, name, desc) => ipcRenderer.invoke('update-folder', id, name, desc),
  getFolders:       ()               => ipcRenderer.invoke('get-folders'),
  updateNoteFolder: (noteId, folderId) => ipcRenderer.invoke('update-note-folder', noteId, folderId),
  getNotesByFolder: (folderId)       => ipcRenderer.invoke('get-notes-by-folder', folderId),

  // ── AI Agent ───────────────────────────────────────────────────────────
  intelligenceQuery:           (msg, notes)  => ipcRenderer.invoke('intelligence-query', { userMessage: msg, notes }),
  intelligenceQueryStructured: (msg, notes)  => ipcRenderer.invoke('intelligence-query-structured', { userMessage: msg, notes }),
  intelligenceExecute:         (actions)     => ipcRenderer.invoke('intelligence-execute', actions),
  intelligenceQueryHelp:       (msg)         => ipcRenderer.invoke('intelligence-query-help', { userMessage: msg }),

  // ── Voice & Intent Memory ──────────────────────────────────────────────
  // Transcribe raw audio ArrayBuffer from MediaRecorder
  transcribeAudio:    (ab)      => ipcRenderer.invoke('transcribe-audio', ab),
  // Parse transcript text → structured intent object
  parseIntent:        (text)    => ipcRenderer.invoke('parse-intent', text),
  // Persist intent + returns optional TTS audioData (ArrayBuffer or null)
  saveIntentMemory:   (intent)  => ipcRenderer.invoke('save-intent-memory', intent),
  // Simulate context trigger → returns memories + optional TTS audioData
  simulateTrigger:    (trigger) => ipcRenderer.invoke('simulate-trigger', trigger),
  // All stored intent memories
  getIntentMemories:  ()        => ipcRenderer.invoke('get-intent-memories'),
  // Delete one intent memory
  deleteIntentMemory: (id)      => ipcRenderer.invoke('delete-intent-memory', id),

  // ── Universal Voice Command (Cmd+M) ───────────────────────────────────
  // Classify a transcript into { mode, payload } — mode: 'dictate'|'app_control'|'agent'
  classifyVoiceCommand: (transcript) => ipcRenderer.invoke('classify-voice-command', transcript),

  // ── Config status (no secrets exposed) ────────────────────────────────
  getConfigStatus: () => ipcRenderer.invoke('get-config-status'),

  // ── Scheduled Reminders ────────────────────────────────────────────────
  createScheduledReminder: (data)  => ipcRenderer.invoke('create-scheduled-reminder', data),
  getScheduledReminders:   ()      => ipcRenderer.invoke('get-scheduled-reminders'),
  deleteScheduledReminder: (id)    => ipcRenderer.invoke('delete-scheduled-reminder', id),
  toggleScheduledReminder: (id)    => ipcRenderer.invoke('toggle-scheduled-reminder', id),
  fireReminder:            (id)    => ipcRenderer.invoke('fire-reminder', id),

  // ── IPC events from main process ──────────────────────────────────────
  // Voice capture toggle sent by the global hotkey (Cmd+Shift+J)
  onToggleVoiceCapture: (cb) => ipcRenderer.on('toggle-voice-capture', () => cb()),
  // Universal voice command toggle sent by the global hotkey (Cmd+M)
  onToggleVoiceCommand: (cb) => ipcRenderer.on('toggle-voice-command', () => cb()),
  // Reminder due (pushed by scheduler)
  onReminderDue: (cb) => ipcRenderer.on('reminder-due', (_e, data) => cb(data)),
});
