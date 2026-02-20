# Project Overview

- **What this project does**: Jot is a minimal sticky-note desktop application. It runs in the background (no dock icon) and is summoned via a global hotkey. Users can create, edit, delete, and restore text notes, as well as create image notes (from file picker or paste). Notes auto-save as the user types.
- **Who it is for**: Users who want quick access to jot down thoughts, snippets, or images without leaving their current context. The global hotkey (Control+Option+Command+J) makes it accessible from any app.
- **Core outcome**: A lightweight, always-available note-taking surface that feels like a digital sticky note—fast to open, minimal UI, persistent storage.

---

# Current State

- **Current milestone**: Feature-complete MVP. Core flows (CRUD, images, keyboard shortcuts, undo) are implemented.
- **Active development area**: Uncertain. No obvious in-progress branches or TODOs in source. The `CLAUDE_PROMPT_KEYBOARD_SHORTCUTS.md` file suggests keyboard shortcuts were added recently via a one-shot prompt.
- **Known blockers**: None detectable. `@electron/rebuild` runs on postinstall to compile `better-sqlite3` for Electron; this can fail on some systems if build tools are missing.

---

# Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Electron 40.x |
| UI | Vanilla HTML/CSS/JS (no framework) |
| Database | better-sqlite3 (SQLite) |
| Build | npm scripts only; no bundler |

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                          │
│  main.js                                                         │
│  - Window lifecycle, global shortcut                              │
│  - IPC handlers (get-notes, create-note, update-note, etc.)       │
│  - File dialog for image import                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ IPC (contextBridge + ipcRenderer)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Preload (preload.js)                                             │
│  - Exposes window.api: getNotes, createNote, updateNote, etc.     │
│  - contextIsolation: true, nodeIntegration: false                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Renderer Process (Browser)                                       │
│  renderer/index.html, renderer.js, style.css                      │
│  - Note list UI, editor UI, image display                         │
│  - DOM manipulation, event handlers, debounced auto-save          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  database.js (Main process only)                                 │
│  - better-sqlite3, single file: ~/Library/Application Support/  │
│    jot/jot.db                                                    │
│  - WAL mode, notes table (id, content, created_at, updated_at)   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Startup**: Main process loads `database.js`, creates window, registers IPC handlers and global shortcut.
2. **Load notes**: Renderer calls `window.api.getNotes()` → IPC → `db.getAllNotes()` → returns array of `{ id, content, created_at, updated_at }`.
3. **Create note**: Renderer calls `window.api.createNote(content)` or `window.api.createNoteFromImage()` → IPC → `db.createNote()` → returns new note row.
4. **Update note**: On `input` (debounced 500ms) or `blur`, renderer calls `window.api.updateNote(id, content)` → IPC → `db.updateNote()`.
5. **Delete note**: Renderer calls `window.api.deleteNote(id)` → IPC → `db.deleteNote()`. Deleted notes are pushed to `deletedNotesStack` for undo.
6. **Restore note**: Cmd+Z pops from `deletedNotesStack` and calls `window.api.restoreNote(note)` → IPC → `db.restoreNote()` (INSERT with original id).
7. **Image notes**: Content is stored as `data:image/...;base64,...` in the `content` column. Image creation via file picker (main process reads file, base64-encodes) or paste (renderer uses FileReader, then createNote).

---

# Folder & File Responsibilities

| Path | Responsibility |
|------|----------------|
| `main.js` | Electron main process. Creates frameless, always-on-top window. Registers global shortcut (Control+Option+Command+J). IPC handlers for all note operations. Hides dock. Handles `create-note-from-image` (file dialog, fs.readFileSync, base64). |
| `preload.js` | Context bridge. Exposes `window.api` with `getNotes`, `createNote`, `createNoteFromImage`, `updateNote`, `deleteNote`, `restoreNote`. |
| `database.js` | SQLite access. Lazy init via `getDb()`. Creates `notes` table if missing. Exports `getAllNotes`, `createNote`, `updateNote`, `deleteNote`, `restoreNote`. Uses WAL mode. |
| `renderer/index.html` | Single-page UI. Titlebar (drag region), note list container, editor (textarea + image display + Back/Delete). Loads `style.css` and `renderer.js`. |
| `renderer/renderer.js` | All renderer logic. DOM refs, `loadNotes()`, `openNote()`, `showList()`, `autoSave()`, keyboard handlers. Manages `currentNote`, `notes`, `selectedIndex`, `deletedNotesStack`. Handles paste-to-create image note. |
| `renderer/style.css` | Styling. Sticky-note aesthetic (yellow/amber palette). Titlebar, note list, editor, buttons. |
| `CLAUDE_PROMPT_KEYBOARD_SHORTCUTS.md` | One-shot prompt used to add Cmd+N, Cmd+S, Cmd+E. Implementation is already in place; this file is reference/documentation. |

---

# Engineering Constraints (Inferred)

- **Patterns followed**:
  - Context isolation and no nodeIntegration in renderer (security).
  - IPC for all main↔renderer communication.
  - Single SQLite file in app userData; no external DB server.
  - Vanilla JS; no React/Vue/Svelte.
  - Debounced auto-save (500ms) to reduce write frequency.
  - Soft delete with undo stack (deleted notes kept in memory until Cmd+Z or session end).

- **Patterns avoided**:
  - No state management library (Redux, Zustand, etc.).
  - No build step (no webpack, Vite, etc.).
  - No tests or test runner.
  - No TypeScript.

---

# Coding Standards (Inferred from codebase)

- **Naming**: camelCase for variables/functions; kebab-case for DOM ids and IPC channel names.
- **Async**: `async/await` for IPC calls; no explicit error handling (errors bubble).
- **DOM**: Direct `document.getElementById` and `innerHTML` for list items; `escapeHtml()` used for text previews to avoid XSS.
- **Structure**: Single `renderer.js` file; no modularization or components.
- **Comments**: Minimal; no JSDoc or inline docs.

---

# Known Issues / Technical Debt

1. **Image storage**: Base64 images stored in SQLite. Large images bloat the DB and can slow queries. No size limit or compression.
2. **Restore note id collision**: `restoreNote` uses `INSERT` with original `id`. If SQLite ever reuses ids (unlikely with AUTOINCREMENT), this could conflict. Low risk in current usage.
3. **No error handling**: IPC handlers and renderer calls do not catch or surface DB or filesystem errors.
4. **Empty note on Back**: If user creates a note, leaves it empty, and clicks Back, the note is deleted. Intentional but could surprise users who expect to keep an "empty" note.
5. **Platform-specific shortcut**: `Control+Option+Command+J` is macOS-oriented. No Windows/Linux shortcut mapping.
6. **Single window**: Only one window instance; no multi-window support.
7. **No search or filtering**: Notes are listed by `updated_at` only; no search, tags, or folders.

---

# External Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app runtime. Provides main/renderer processes, BrowserWindow, globalShortcut, ipcMain, dialog, screen, app. |
| `better-sqlite3` | Synchronous SQLite bindings. Used for local note storage. Chosen for simplicity (no async DB layer) and performance. Requires native compilation; `@electron/rebuild` ensures compatibility with Electron's Node version. |
| `@electron/rebuild` | Rebuilds native modules (e.g. better-sqlite3) for Electron's bundled Node. Run via `postinstall` script. |

---

# Future Improvement Opportunities

1. **Image optimization**: Compress or resize images before storage; store files on disk and reference by path.
2. **Error handling**: Add try/catch around DB and IPC; show user-facing error messages.
3. **Cross-platform shortcuts**: Map hotkey per platform (e.g. Ctrl+Shift+J on Windows/Linux).
4. **Search**: Add a search/filter bar in the note list.
5. **Export/backup**: Export notes to JSON or Markdown; backup/restore DB.
6. **Testing**: Add unit tests for database module; integration tests for IPC.
7. **Modularization**: Split renderer.js into modules (e.g. notes, editor, keyboard).
8. **Settings**: Allow user to change hotkey, window position, or theme.
