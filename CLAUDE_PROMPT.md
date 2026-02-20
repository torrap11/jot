# One-Shot Prompt: Easy Jot — Sticky Note Desktop App

Use this prompt with Claude Code to build the Easy Jot application:

---

**Build a desktop application with the following specifications:**

1. **Trigger**: The app is activated by a global keyboard shortcut: **Control + Option + Command + J** (all four keys pressed simultaneously). When triggered, show a small floating window; when triggered again while visible, hide it (toggle behavior).

2. **UI**: A minimal sticky-note style window:
   - Small, draggable window (e.g., ~300×250px)
   - Text area for entering notes
   - Save button (or auto-save on blur/close)
   - Clean, simple design (light yellow sticky-note aesthetic or minimal dark/light theme)

3. **Persistence**: Store notes in a **local database** (SQLite preferred—single file, no server). Schema should support:
   - Multiple notes (each with id, content, created_at, updated_at)
   - CRUD operations

4. **Tech stack**: Use whatever is most appropriate for a cross-platform desktop app (e.g., Electron, Tauri, or Python + PyQt/Tkinter). Prefer something lightweight and easy to run.

5. **Deliverables**:
   - Working app that runs on macOS
   - README with setup and run instructions
   - Clear project structure

---
