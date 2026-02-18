# One-Shot Prompt: Add Keyboard Shortcuts to Jot

Use this prompt with Claude Code to add the keyboard shortcuts in one shot:

---

**Add the following keyboard shortcuts to the Jot sticky-note app:**

1. **Command+N** — Opens a new jot (same behavior as clicking the "+" button: create a new note and open the editor).

2. **Command+S** — Manually saves the current jot (persist the current note's content to the database; same as the existing `autoSave` logic but triggered explicitly).

3. **Command+E** — Exits the current jot (same behavior as clicking "Back": save if needed, close the editor, return to the note list).

**Implementation requirements:**
- Register these shortcuts in the renderer process (they apply when the Jot window is focused).
- Use `keydown` on `document` or `window`; check for `event.metaKey` (Command on macOS).
- Call `event.preventDefault()` for Command+N and Command+S to avoid browser/Electron defaults.
- Wire each shortcut to the existing functions in `renderer/renderer.js`:
  - Cmd+N → same logic as `newBtn` click (create note, then `openNote`)
  - Cmd+S → call `autoSave()` (or expose a `manualSave` that does the same)
  - Cmd+E → call `showList()` (same as `backBtn` click)
- Ensure shortcuts work in both views: when the note list is visible (Cmd+N only) and when the editor is open (all three).

**Files to modify:**
- `renderer/renderer.js` — add a single `keydown` listener that handles the three shortcuts.

---
