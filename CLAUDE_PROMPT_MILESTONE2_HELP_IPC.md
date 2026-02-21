# One-Shot Prompt: Milestone 2 — Add Help IPC Handler

Use this prompt with Claude Code to implement Milestone 2 in one shot.

**Prerequisite:** Milestone 1 must be complete (`keybinds.js` exists at project root).

---

**Add a keybind-help IPC handler to the Easy Jot app so the AI agent can answer questions about keyboard shortcuts.**

## 1. In main.js

- Add `const keybinds = require('./keybinds');` near the top (with other requires).
- Add `ipcMain.handle('intelligence-query-help', async (_e, { userMessage }) => { ... });` alongside the other intelligence handlers (around line 81).
- Inside the handler:
  - Build a system prompt by appending the keybind list to the existing `AGENT_SYSTEM_PROMPT`. Add: `" You can also answer questions about keyboard shortcuts. Here are the shortcuts:\n"` followed by each shortcut formatted as `"- {keys}: {action}\n"` (combine `keybinds.global` and `keybinds.inApp` into one list).
  - Call `llm.callLLM(systemPrompt, userMessage, [])` — no notes context needed.
  - Return `{ response }` on success.
  - On catch, return `{ error: err.message }`.

## 2. In preload.js

- Add `intelligenceQueryHelp: (userMessage) => ipcRenderer.invoke('intelligence-query-help', { userMessage })` to the `api` object exposed via `contextBridge.exposeInMainWorld`.

**Deliverables:** Updates to `main.js` and `preload.js`.
