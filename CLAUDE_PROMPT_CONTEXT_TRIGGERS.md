# One-Shot Prompt: Context-Triggered Intent Recall (M1–M4)

Use this prompt with Claude Code to implement the context-triggered reminder feature. Follow the development procedure strictly.

---

## Context

**EasyJot** is evolving from a sticky-note app into a **Context-Triggered Intent Memory System**. The core use case:

> User writes "watch netflix in chinese". Later, when they open Netflix (browser or app), a reminder surfaces: "watch netflix in chinese".

**Principle**: Simulate first, detect later. Build the match-and-surface pipeline first, fed by a *manual* trigger. Swap in real detection (browser extension, app detection) later.

**Docs to read before coding**: `dev-docs/MILESTONES.md`, `PROJECT_CONTEXT.md`, `END_GOAL_SUMMARY.md`

---

## Development Procedure (MANDATORY)

### 1. Branching

- Create a feature branch: `feature/context-triggers-m1` (or `m2`, `m3`, `m4` as you progress).
- Branch naming: `feature/<short-description>-m<N>` or `fix/<description>`.
- Work on one milestone per branch when possible; merge before starting the next.

### 2. Commits

- **Commit frequently** — after each logical unit (e.g., "Add trigger_pattern column", "Wire up simulate UI", "Add IPC handler").
- **Commit message format**: `type(scope): description`
  - Types: `feat`, `fix`, `refactor`, `docs`, `chore`
  - Scope: `db`, `ipc`, `ui`, `keybinds`, etc.
  - Examples:
    - `feat(db): add trigger_pattern column to notes`
    - `feat(ui): add simulate context control to agent panel`
    - `feat(ipc): add context-trigger-match handler`
- **Never** commit broken state. Each commit should leave the app runnable.

### 3. Naming Conventions

- **Variables/functions**: camelCase (`triggerPattern`, `getMatchingNotes`)
- **DOM ids**: kebab-case (`simulate-context-input`, `triggered-notes-panel`)
- **IPC channels**: kebab-case (`context-trigger-match`, `get-notes-by-trigger`)
- **DB columns**: snake_case (`trigger_pattern`, `triggered_at`)
- **Files**: kebab-case or camelCase matching existing style (`database.js`, `keybinds.js`)

### 4. Order of Work

1. **Database** — schema changes first, with migration.
2. **IPC / main process** — handlers, logic.
3. **Preload** — expose new APIs.
4. **Renderer** — UI, event handlers.
5. **Keybinds** — add new shortcuts to `keybinds.js` and document in README.

---

## Milestone M1: Manual Trigger + Keyword Match

**Goal**: User types "netflix" in a "Simulate context" control → app shows notes whose content contains "netflix".

### Scope

1. **UI**: Add "Simulate context" to the agent panel (or a small control):
   - Input field + button, or Cmd+Shift+T to focus and Enter to fire.
   - User enters: `netflix`, `netflix.com`, `Slack`, etc.

2. **Match logic**: Simple keyword search — `content LIKE '%netflix%'` (case-insensitive). Run in main process or database layer.

3. **Surface**: Show matching notes in the agent panel results area (reuse existing layout) or a "Triggered" section. No toast yet.

4. **Keybinds**: Add `Cmd+Shift+T` → "Simulate context" to `keybinds.js` and register in renderer.

### Implementation Notes

- Add IPC: `context-trigger-match` with payload `{ context: string }` → returns `{ notes: [...] }`.
- Database: `getNotesMatchingContext(context)` — `SELECT * FROM notes WHERE LOWER(content) LIKE LOWER(?)` with parameter `%${context}%`. Use parameterized queries only; never concatenate user input into SQL.
- Keep it minimal. No schema change for M1.

### Success Criteria

- Create note "watch netflix in chinese".
- Press Cmd+Shift+T, type "netflix", submit.
- See that note in the triggered results.

---

## Milestone M2: Explicit Note–Trigger Association

**Goal**: User links a note to a trigger (e.g., "netflix.com"). Only linked notes surface when that trigger fires.

### Scope

1. **Schema**: Add `trigger_pattern TEXT` to `notes` (nullable). Migration in `database.js` like existing `folder_id` migration.

2. **UI**: In the note editor, add "Show when: [input]" — optional. Store in `trigger_pattern`.

3. **Match logic**: When context `X` fires:
   - First: match notes where `trigger_pattern` matches `X` (exact or contains; normalize domains: `netflix.com` matches `netflix`).
   - Fallback: if no explicit matches, still show keyword matches (M1 behavior).

4. **CRUD**: `updateNote` must support `trigger_pattern`. Add `updateNoteTrigger(id, pattern)` or extend `updateNote`.

### Success Criteria

- Link note "watch netflix in chinese" to "netflix.com".
- Simulate "netflix" or "netflix.com" → only that note (and others with same trigger) appears.
- Note without trigger still matches via keyword if fallback enabled.

---

## Milestone M3: Surfacing UX + Feedback

**Goal**: Non-intrusive reminder (toast or panel), dismiss/snooze/done, "Why did I see this?"

### Scope

1. **Surface**: When matches exist, show a toast or slide-in panel. Keyboard-dismissible (Escape).

2. **Actions**: Dismiss (hide), Snooze (remind in N min), Done (mark acted on). Store outcome for future learning (optional table `trigger_outcomes`).

3. **Transparency**: "Why did I see this?" — show trigger that fired + matched note(s).

4. **Cooldown**: Don't re-surface same trigger+note for 15–30 min (configurable). Store last_triggered in memory or DB.

### Success Criteria

- Simulate Netflix → toast/panel appears with "watch netflix in chinese".
- User can dismiss, snooze, or mark done.
- Clear "Triggered by: netflix.com" explanation.

---

## Milestone M4: Real Context Detection (Future)

**Goal**: Browser extension or app detection sends context events. Same match logic.

- **Out of scope for initial one-shot.** Document the interface: context event format `{ type: 'domain', value: 'netflix.com' }` so M4 can plug in later.
- If implementing: browser extension (Chrome/FF) with native messaging to Electron, or macOS accessibility API for frontmost app.

---

## Technical Constraints (Must Follow)

- **Electron**: main + preload + renderer. Context isolation, no nodeIntegration in renderer.
- **IPC**: All main↔renderer via `contextBridge` and `ipcRenderer.invoke`.
- **Database**: `database.js`, better-sqlite3, migrations via `pragma table_info` checks.
- **UI**: Vanilla JS, no framework. `document.getElementById`, `innerHTML` with `escapeHtml()` for user content.
- **Keybinds**: Add new shortcuts to `keybinds.js`; register in `main.js` (global) or `renderer.js` (in-app).
- **Naming**: camelCase (code), kebab-case (DOM, IPC). See Coding Standards in PROJECT_CONTEXT.md.

---

## Deliverables

1. **Working app** — M1 at minimum; M2 and M3 if scope allows.
2. **Updated README** — Document Cmd+Shift+T and "Simulate context" in Keyboard Shortcuts.
3. **Updated keybinds.js** — New shortcuts listed.
4. **Clean git history** — Feature branch, frequent commits with conventional messages.
5. **PROJECT_CONTEXT.md** — Update "Current State" and "Active development area" to reflect new features.

---

## Execution Checklist

- [ ] Create branch `feature/context-triggers-m1`
- [ ] Implement M1 (simulate + keyword match)
- [ ] Commit after each logical step
- [ ] Test: note "watch netflix in chinese" → simulate "netflix" → see note
- [ ] Add Cmd+Shift+T to keybinds.js
- [ ] Update README
- [ ] (Optional) Implement M2, M3 on same or new branches
- [ ] Update PROJECT_CONTEXT.md
