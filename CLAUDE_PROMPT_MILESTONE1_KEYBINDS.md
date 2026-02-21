# One-Shot Prompt: Milestone 1 — Centralize Keybinds

Use this prompt with Claude Code to implement Milestone 1 in one shot:

---

**Add a `keybinds.js` file to the Easy Jot project root that exports a structured list of all keyboard shortcuts.**

**Export format:**

```javascript
module.exports = {
  global: [
    { keys: 'Cmd+E', action: 'Toggle app window (show/hide)' },
  ],
  inApp: [
    { keys: 'Cmd+J', action: 'Open/close AI agent' },
    { keys: 'Cmd+N', action: 'New note' },
    { keys: 'Cmd+S', action: 'Save and open folder picker' },
    { keys: 'Cmd+I', action: 'New note from image' },
    { keys: 'Cmd+F', action: 'Toggle folder organize view' },
    { keys: 'Escape', action: 'Go back / close panel / close note' },
    { keys: 'Cmd+Z', action: 'Undo delete (restore note)' },
    { keys: 'Arrow Up/Down + Enter', action: 'Navigate and open note in list' },
    { keys: 'Delete / Backspace', action: 'Delete selected note (in list)' },
    { keys: 'Ctrl+Tab / Ctrl+Shift+Tab', action: 'Cycle folder filter' },
  ],
};
```

**Implementation requirements:**
- Create the file at the project root (same level as `main.js`).
- Match the shortcuts to what is actually implemented in `main.js` (global Cmd+E) and `renderer/renderer.js` (keydown handler around lines 228–348).
- Do not add or remove any shortcuts — only centralize what exists.

**Deliverable:** New file `keybinds.js` at project root.
