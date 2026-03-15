# Project Overview

- **What this project does**: Easy Jot is a minimal sticky-note desktop application. It runs in the background (no dock icon) and is summoned via a global hotkey (Cmd+E). Users can create, edit, delete, and restore text and image notes, organize them into folders, and use an AI agent to search, organize, or ask about keyboard shortcuts. Notes auto-save as the user types.
- **Who it is for**: Users who want quick access to jot down thoughts, snippets, or images without leaving their current context. The global hotkey makes it accessible from any app.
- **Core outcome**: A lightweight, always-available note-taking surface that feels like a digital sticky note—fast to open, minimal UI, persistent storage, with optional AI assistance.

---

# Product Vision & End Goal

> **Full vision docs**: See [dev-docs/](dev-docs/) for organized strategy, market, and business documents.

**EasyJot's strategic direction** is to evolve from a sticky-note app into a **Context-Triggered Intent Memory System**—a keyboard-first "intent capture + recall" product that surfaces the user's own intentions *at the moment they become actionable* (e.g., when a relevant site opens, a meeting begins, or a workflow is resumed).

**Core promise**: Not "better notes" or "better tasks," but **right-time, right-context recall**.

**Target architecture**: Local-first client with (a) global hotkey capture, (b) context triggers (app open, domain, calendar, contact), (c) personal intent graph, (d) AI-assisted extraction and recall, (e) behavioral learning loop.

**Business goal**: Credible path to $10M+ ARR via prosumer → team → enterprise subscription ladder.

See [END_GOAL_SUMMARY.md](END_GOAL_SUMMARY.md) for a concise summary.

---

# Current State

- **Current milestone**: Feature-complete. Core flows (CRUD, images, folders, keyboard shortcuts, undo, AI agent, keybind help) are implemented.
- **Active development area**: None. Recent additions: keybind help via agent (learn-as-needed), contextual Escape behavior.
- **Known blockers**: None. `@electron/rebuild` runs on postinstall to compile `better-sqlite3` for Electron; this can fail on some systems if build tools are missing.

---

# Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Electron 40.x |
| UI | Vanilla HTML/CSS/JS (no framework) |
| Database | better-sqlite3 (SQLite) |
| LLM | OpenAI SDK (OpenAI API or Ollama) |
| Build | npm scripts only; no bundler |

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                          │
│  main.js                                                         │
│  - Window lifecycle, global shortcut (Cmd+E)                      │
│  - IPC handlers: notes, folders, intelligence-query, etc.         │
│  - File dialog for image import                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ IPC (contextBridge + ipcRenderer)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Preload (preload.js)                                             │
│  - Exposes window.api: getNotes, createNote, intelligenceQuery,  │
│    intelligenceQueryStructured, intelligenceQueryHelp, etc.      │
│  - contextIsolation: true, nodeIntegration: false                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Renderer Process (Browser)                                       │
│  renderer/index.html, renderer.js, style.css                      │
│  - Note list, editor, image display, folder bar, agent panel      │
│  - DOM manipulation, keyboard handlers, intent-based routing      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Supporting modules (Main process)                               │
│  database.js   - SQLite CRUD, notes + folders                     │
│  llm.js        - OpenAI client, callLLM, callLLMWithStructuredOutput │
│  keybinds.js   - Centralized keyboard shortcut definitions       │
│  intelligence/executor.js - Action execution (search, create, move) │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Startup**: Main process loads `database.js`, `llm.js`, `keybinds.js`, `executor`, creates window, registers IPC handlers and global shortcut (Cmd+E).
2. **Load notes**: Renderer calls `window.api.getNotes()` or `getNotesByFolder(folderId)` → IPC → `db.getAllNotes()` / `db.getNotesByFolder()` → returns notes (with `folder_id`).
3. **Folders**: `getFolders`, `createFolder`, `updateFolder`, `updateNoteFolder` for organization. Folder filter pills in UI; Ctrl+Tab cycles filters.
4. **AI Agent**: User types message → intent check (keybind help vs action) → `intelligenceQueryHelp` (free-form) or `intelligenceQueryStructured` (JSON actions) → `intelligenceExecute` → UI refresh.
5. **Keybind help**: If message contains "shortcut", "keybind", "how do i", etc. → route to `intelligenceQueryHelp` with keybinds in system prompt → display prose response.
6. **Image notes**: File picker (Cmd+I) or paste. Content stored as `data:image/...;base64,...`. Empty note on Back is deleted.

---

# Folder & File Responsibilities

| Path | Responsibility |
|------|----------------|
| `main.js` | Electron main process. Frameless, always-on-top window. Global shortcut Cmd+E. IPC handlers for notes, folders, intelligence-query, intelligence-query-structured, intelligence-query-help, intelligence-execute, resize-window, create-note-from-image. |
| `preload.js` | Context bridge. Exposes `window.api` with all IPC methods including `intelligenceQueryHelp`, `intelligenceQueryStructured`, `intelligenceExecute`. |
| `database.js` | SQLite. `notes` (id, content, folder_id, created_at, updated_at), `folders` (id, name, description). CRUD for notes and folders. WAL mode. |
| `llm.js` | OpenAI client. `callLLM` (free-form), `callLLMWithStructuredOutput` (JSON actions). Config from env or `config.json`. Supports Ollama via `useOllama`. |
| `keybinds.js` | Exports `global` and `inApp` shortcut arrays. Single source of truth for keyboard shortcuts. |
| `intelligence/executor.js` | Executes action arrays: search, create_note, create_folder, move_note_to_folder, organize_into_folders. |
| `renderer/index.html` | UI: agent panel, main pane, folder bar, note list, folder organize view, editor. |
| `renderer/renderer.js` | All renderer logic. loadNotes, openNote, showList, autoSave, folder/filter state, agent panel, sendAgentMessage with intent routing, keyboard handlers. Escape is contextual (note → folder → agent). |
| `renderer/style.css` | Styling. Sticky-note aesthetic. |

---

# Engineering Constraints (Inferred)

- **Patterns followed**:
  - Context isolation and no nodeIntegration in renderer (security).
  - IPC for all main↔renderer communication.
  - Single SQLite file in app userData; no external DB server.
  - Vanilla JS; no React/Vue/Svelte.
  - Debounced auto-save (500ms).
  - Soft delete with undo stack (Cmd+Z).
  - Intent-based routing for agent (keybind help vs structured actions).

- **Patterns avoided**:
  - No state management library.
  - No build step.
  - No tests or test runner.
  - No TypeScript.

---

# Coding Standards (Inferred from codebase)

- **Naming**: camelCase for variables/functions; kebab-case for DOM ids and IPC channel names.
- **Async**: `async/await` for IPC calls.
- **DOM**: Direct `document.getElementById`, `innerHTML` for list items; `escapeHtml()` for text previews.
- **Structure**: Single `renderer.js` file; no modularization.

---

# Known Issues / Technical Debt

1. **Image storage**: Base64 images in SQLite. Large images bloat the DB. No size limit or compression.
2. **Restore note id collision**: Low risk; `restoreNote` uses INSERT with original id.
3. **No error handling**: IPC and renderer do not consistently surface DB/API errors.
4. **Empty note on Back**: Deleted. Intentional but could surprise users.
5. **Platform-specific shortcut**: Cmd+E is macOS-oriented. No Windows/Linux mapping.
6. **Single window**: No multi-window support.

---

# External Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app runtime. BrowserWindow, globalShortcut, ipcMain, dialog, screen, app. |
| `better-sqlite3` | Synchronous SQLite bindings. Requires `@electron/rebuild` for Electron. |
| `openai` | OpenAI SDK. Used for OpenAI API and Ollama (OpenAI-compatible endpoint). |
| `@electron/rebuild` | Rebuilds native modules for Electron. Postinstall script. |

---

# Future Improvement Opportunities

1. **Image optimization**: Compress or resize images; store files on disk.
2. **Error handling**: Try/catch around DB and IPC; user-facing error messages.
3. **Cross-platform shortcuts**: Map hotkey per platform.
4. **Export/backup**: Export notes to JSON or Markdown.
5. **Testing**: Unit tests for database; integration tests for IPC.
6. **Modularization**: Split renderer.js into modules.
7. **Settings**: User-configurable hotkey, theme.
