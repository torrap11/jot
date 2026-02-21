# One-Shot Prompt: Milestone 3 — Route Agent to Help Path

Use this prompt with Claude Code to implement Milestone 3 in one shot.

**Prerequisite:** Milestones 1 and 2 must be complete (`keybinds.js` exists, `intelligenceQueryHelp` exposed in preload).

---

**Wire the Easy Jot agent to route keybind/help questions to the help path and display prose answers.**

## 1. In renderer/renderer.js, inside sendAgentMessage()

Before the `intelligenceQueryStructured` call (around line 398), add intent detection:

- If the user message (lowercased, trimmed) contains any of these substrings, treat as keybind help: `'shortcut'`, `'shortcuts'`, `'keybind'`, `'keybinds'`, `'keyboard'`, `'hotkey'`, `'hotkeys'`, `'how do i'`, `'how to'`, `'what key'`, `'what keys'`, `'help'`, `'command'`, `'keys for'`, `'key for'`.
- If matched:
  - Call `window.api.intelligenceQueryHelp(text)` instead of `intelligenceQueryStructured`.
  - On success: set `replyMsg.className = 'agent-message assistant'` and `replyMsg.textContent = response`. Skip the execute/summary path entirely (no `loadNotes`, `loadFolders`, `buildActionSummary`, `formatActionsDebug`).
  - On error: set `replyMsg.className = 'agent-message error'` and `replyMsg.textContent = error` (same as existing error handling).
  - Ensure the `finally` block still runs (re-enable input, scroll, focus, saveAgentChat).
- If not matched: keep the existing flow (intelligenceQueryStructured → intelligenceExecute → buildActionSummary → formatActionsDebug).

## 2. In renderer/index.html

Add a second example to the agent empty state. After the existing line with "Example: Find all jots about X...", add a line break and: `Example: What's the shortcut for a new note?`

**Deliverables:** Updates to `renderer/renderer.js` and `renderer/index.html`.
