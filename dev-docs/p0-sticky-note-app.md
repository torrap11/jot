# P0: Easy Jot — Sticky Note Desktop App

## Context
Build a macOS desktop app triggered by a global hotkey (Ctrl+Opt+Cmd+J) that shows a floating sticky-note window for quick note-taking, backed by SQLite.

## Tech Stack
- **Electron** — built-in `globalShortcut` API, `BrowserWindow` for the floating note UI
- **better-sqlite3** — synchronous SQLite bindings, single-file DB
- **No framework** — vanilla HTML/CSS/JS for the renderer (keeps it simple)

## Project Structure
```
easy-jot/
├── package.json
├── main.js            # Electron main process (window, shortcuts, IPC)
├── preload.js         # Context bridge for DB operations
├── database.js        # SQLite CRUD (notes table)
├── renderer/
│   ├── index.html     # UI markup
│   ├── style.css      # Sticky-note styling
│   └── renderer.js    # UI logic (list/create/edit/delete notes)
└── README.md          # Setup & run instructions
```

## Implementation Steps

### 1. Initialize project
- `npm init` + install `electron` and `better-sqlite3`
- Configure `package.json` scripts (`start` → `electron .`)

### 2. Database layer (`database.js`)
- Create/open `easy-jot.db` in the app's user data directory
- Schema: `notes(id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, created_at TEXT, updated_at TEXT)`
- Exports: `getAllNotes()`, `createNote(content)`, `updateNote(id, content)`, `deleteNote(id)`

### 3. Main process (`main.js`)
- Create a frameless, always-on-top `BrowserWindow` (~300x250px)
- Register global shortcut `Control+Option+Command+J` to toggle visibility
- Set up IPC handlers for CRUD operations (calling `database.js`)
- Position window near top-right of screen
- Hide from dock when window is hidden

### 4. Preload script (`preload.js`)
- Expose `window.api` via `contextBridge` with methods: `getNotes`, `createNote`, `updateNote`, `deleteNote`

### 5. Renderer UI (`renderer/`)
- **index.html**: Note list sidebar (compact), text area, save/delete buttons, "+" button for new note
- **style.css**: Light yellow sticky-note aesthetic, rounded corners, subtle shadow, clean typography
- **renderer.js**: Load notes on start, handle create/edit/delete, auto-save on blur

### 6. README.md
- Prerequisites (Node.js)
- `npm install` + `npm start`
- Hotkey usage

## Verification
1. Run `npm start` — app should launch with no visible window
2. Press Ctrl+Opt+Cmd+J — floating sticky note window appears
3. Type a note, click save — note persists
4. Press hotkey again — window hides
5. Press hotkey — window reappears with saved note
6. Create multiple notes, delete notes — all operations work
