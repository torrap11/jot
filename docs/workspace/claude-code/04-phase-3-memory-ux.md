# Phase 3 — Memory UX in Jot (Record, Rewind, Ask)

**PRD ref:** §11 Phase 3, §7.2 M1–M4, §6.1–6.2  
**Goal:** Daily use of Record/Rewind/Ask inside Jot without opening Screenpipe Tauri.

---

## Read first

- `PRD.md` §6.1–6.2
- `engine/.claude/skills/screenpipe-api/SKILL.md` (search patterns, auth, progressive disclosure)
- `jot/renderer/` (search window patterns)

---

## Tasks

### 1. Engine UX in Jot

- Tray: recording on/off, pause if API supports, link to permissions help
- Settings panel: engine path, API key, “open logs” hint (`PROACTIVE_RECALL.md`)
- Onboarding step (minimal): Screenpipe permissions + Jot Automation — single flow doc in `manual-qa.md`

### 2. Search (Rewind entry)

New or extended Jot window/panel:

- Query `GET /search` with **required** `start_time`, low `limit`, auth header
- Filters: `app_name`, `content_type` chips (default `all`)
- Result list: timestamp, app, snippet; click → detail or open frame context
- Progressive disclosure per API skill: prefer `/memories` and `/activity-summary` for broad queries

### 3. Ask

- Panel: natural language question → orchestrate `/memories` + `/search` (no LLM required for v1 OR optional Anthropic **off hot path** only when user opts in)
- Merge **Jot notes** search (`database.js` FTS or existing search) into results list with clear source badges (`note` vs `capture`)

### 4. Bundle engine (release path)

- `electron-builder` `extraResources`: copy `screenpipe` binary from `engine/target/release/`
- `engineManager` uses bundled path when packaged
- Document unsigned vs signed build in `jot/docs/` or workspace README

### 5. Tests

- Integration tests with mocked HTTP for search client
- Smoke: `npm test` still green

---

## Exit criteria

- [ ] User can search captured history from Jot without Tauri app
- [ ] Ask returns blended notes + capture results (deterministic v1 OK)
- [ ] Tray reflects recording state from engine/health
- [ ] Packaged build includes engine binary (or clear build script)
- [ ] `npm test` passes

---

## Verification

```bash
cd engine && cargo build --release --features metal,apple-intelligence
cd . && npm run dist   # or dist:universal — document if signing skipped
npm test
```

Human: install `.dmg` or run packaged app; confirm search returns results after 5+ min capture.

---

## Do not

- Cloud sync
- Replace Screenpipe MCP server
- Full Tauri feature parity (pipes UI optional P2)

---

## On completion

Update `CLAUDE_PROGRESS.md` → phase 3 ✅, proceed to `05-phase-4-polish-ship.md`.
