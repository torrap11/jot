# Jot AI agent — conversational note interaction

The **Jot AI agent** is Jot’s on-demand LLM surface for **reorganizing and interacting with notes** when you have manual specifications. It is **not** the proactive resurfacing system.

---

## Purpose

Jot is the **in-app expert** for Jot: shortcuts, tabs, resurfacing, permissions, **and** note reorganization.

| Jot AI agent | Proactive overlay |
|------------|-------------------|
| User opens chat | System shows card |
| Answers how-to from `jot/jot/jotProductGuide.js` | N/A |
| Mutates notes (with confirm) | Read-only snippet + actions |
| LLM allowed | No LLM |
| Slow OK (seconds) | &lt;500ms path for context |

**Product knowledge** lives in `jot/jot/jotProductGuide.js` — update when shortcuts or UI change.

---

## UX

### Placement

- Dedicated tab **Jot** in main window (preferred over burying in settings).
- Optional: ⌘⇧P opens Jot with focus.

### Conversation pattern

1. User describes intent in natural language.
2. Jot proposes **plan** (bullet list) + **preview** of DB changes.
3. User **Confirm** / **Edit** / **Cancel**.
4. On confirm, main process executes tools; transcript stays in session.

### Empty state copy

> “Tell Jot how to reorganize your notes. Example: Move all notes about Client A into the Q2 folder and tag them `client-a`.”

---

## Tool schema (v1)

Implement as IPC tools in main process; LLM receives JSON schema.

| Tool | Args | Effect |
|------|------|--------|
| `search_notes` | `query`, `limit?` | Returns id, title, snippet |
| `list_notes` | `folder_id?`, `limit?` | Returns note list |
| `get_note` | `note_id` | Full note |
| `move_to_folder` | `note_ids[]`, `folder_id` | Updates folder |
| `set_tags` | `note_ids[]`, `tags[]` | Add tags field if missing |
| `merge_notes` | `target_id`, `source_ids[]` | Concat body; delete sources after confirm |
| `set_organize_hint` | `note_id`, `hint` | Updates hint |
| `create_folder` | `name`, `parent_id?` | New folder |

**Not in v1:** delete all notes, export cloud, edit screen capture DB.

---

## System prompt (template)

```text
You are Jot, the reorganizer for Jot. You only change the user's local notes database.
Rules:
- Propose changes before executing destructive or bulk operations.
- Reference note ids from tool results.
- Never claim to have changed notes without a successful tool call.
- Do not discuss proactive resurfacing or screen recording unless asked.
- If no API key, tell the user to add one in Settings.
```

---

## API key

- Reuse Anthropic key path from Engine menu / existing organize flow.
- `organizeNoteFromHint` in `renderer.js` is a precedent for single-note organize — generalize for multi-note tools.

---

## Safety

- **Confirm** modal for: merge &gt;2 notes, delete, move &gt;10 notes.
- Log tool calls to `~/Library/Logs/Jot/jot-agent.log` (debug).
- No automatic runs on timer (unlike “night organize”).

---

## Implementation plan

| Step | File(s) |
|------|---------|
| 1 | `jot/jot/jotTools.js` — pure functions calling `db.js` |
| 2 | `jot/jot/jotAgent.js` — LLM loop + tool dispatch |
| 3 | `app-main.js` — `ipcMain.handle('jota:chat', ...)` |
| 4 | `renderer/jot-panel.html` or tab in `index.html` |
| 5 | `tests/test-jot-tools.js` — no network |

---

## Tests (required)

- Tool: `search_notes` returns expected ids from fixture DB
- Tool: `merge_notes` requires confirm flag
- Agent: mock LLM returns tool call → handler invoked once

---

## Not in Jot

There is **no** Ask-over-screen or Rewind tab. Jot is the only LLM chat surface, and it only mutates **notes** ([SCOPE.md](./SCOPE.md)).
