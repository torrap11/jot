# Jot Repository Summary

This document is a comprehensive technical overview of the `jot` repository for onboarding, handoff, and maintenance.

## 1) What this repo is

`jot` is a local-first macOS desktop notes app built with Electron. It captures notes quickly, links notes to app context, and proactively surfaces relevant notes when specific apps are in use.

The app combines:

- local note storage (SQLite)
- context detection (frontmost app polling on macOS)
- proactive surfacing (overlay cards)
- AI-assisted organization and chat (Anthropic API)

## 2) Runtime stack and tooling

### Core runtime

- Electron (desktop shell + multi-window app)
- Node.js (main process + app logic)
- SQLite via `better-sqlite3` (local persistence)

### Build and packaging

- `electron-builder` for macOS artifacts
- notarization hook in `scripts/notarize.js`
- entitlements in `build/entitlements.mac.plist`

### Package manager

- npm (`package-lock.json` present)

### Scripts (from `package.json`)

- `npm start` - run app in development
- `npm test` - run tests via Node test runner
- `npm run rebuild` - rebuild native modules
- `npm run dist` - build arm64 distribution
- `npm run dist:universal` - build universal distribution
- `npm run dist:signed` - build signed distribution

## 3) High-level architecture

### Main process

`app-main.js` is the central orchestrator:

- creates/manages capture, main/search, and overlay windows
- registers IPC handlers used by renderer processes
- initializes DB and background services
- coordinates app watcher + surfacing flow
- handles attachment protocol/opening behavior

### Preload security boundary

- `preload.js` (main/search/capture bridge)
- `overlay/overlay-preload.js` (overlay bridge)

These expose constrained APIs through `contextBridge`.

### Data and persistence

`database.js` handles:

- schema creation
- in-place migration logic
- CRUD operations
- app-link/folder-link relationships
- attachment metadata
- import/export and DB replacement behavior

### Context and surfacing domain

- `appWatcher.js` - detects frontmost app (macOS/AppleScript)
- `knownApps.js` - app aliases and known mappings
- `noteAppScan.js` - matching note content to app aliases
- `surfaceEngine.js` - scoring/selection and cooldown/snooze logic

### UI layers

- `renderer/` - main window UI and capture flow
- `overlay/` - proactive surfaced-note overlay

Key files:

- `renderer/renderer.js`
- `renderer/capture.js`
- `overlay/overlay.js`

### AI integration

`aiOrganize.js` contains Anthropic API integration for:

- organization planning/apply flows
- chat-style assistance

## 4) Main product workflows

### Workflow A: App startup

1. Electron app initializes.
2. DB is opened/initialized.
3. Windows and IPC endpoints are registered.
4. App watcher starts polling frontmost app.

### Workflow B: Quick capture

1. User types note in capture UI.
2. Renderer invokes preload API.
3. IPC handler persists note in DB.
4. Optional app-link metadata is saved.

### Workflow C: Search/edit notes

1. Main UI requests recent/query results.
2. User edits note content/title/folders/links.
3. Renderer sends update requests through IPC.
4. DB updates persist changes locally.

### Workflow D: Proactive surfacing

1. Watcher detects active app.
2. Surface engine resolves app aliases.
3. Candidate notes are selected and ranked.
4. Overlay displays note cards.
5. User actions (open/snooze/dismiss/complete) update surfacing state.

### Workflow E: Attachments

1. User selects/pastes image/file.
2. Main process stores file in app data directory.
3. Metadata row is written to DB.
4. Renderer accesses via internal protocol/open action.

### Workflow F: AI-assisted organization/chat

1. Renderer sends prompt/history payload over IPC.
2. Main process invokes Anthropic Messages API.
3. Parsed plan/response is returned to renderer.
4. Optional organization changes are applied through DB operations.

## 5) Data model and storage

## Database

Core tables (managed in `database.js`):

- `notes`
- `note_app_links`
- `note_surface_state`
- `note_images`
- `note_files`
- `folders`
- `folder_app_links`

## File storage

- image and file attachments are stored on local disk under app data folders
- DB stores metadata + references

## Migration strategy

- migration is handled in-process inside `database.js`
- no separate migration framework/directory currently

## 6) Integrations and external dependencies

- **Anthropic API** (`https://api.anthropic.com/v1/messages`) in `aiOrganize.js`
- **macOS AppleScript/System Events** in `appWatcher.js` for frontmost app
- **OS-level open behavior** via Electron shell APIs in main process
- **Apple notarization** through `@electron/notarize` in release pipeline

## 7) Testing and quality status

Current tests are limited and mainly cover app-context logic:

- `tests/test-note-app-scan.js`
- `tests/test-surface-engine.js`

Observations:

- no broad integration tests for IPC + DB flows
- no E2E test suite for core user journeys
- no explicit lint/typecheck script visible in `package.json`

## 8) Security and privacy considerations

### Good patterns present

- context isolation and preload bridge model
- constrained IPC surface between renderer and main
- local-first storage by default

### Areas to watch closely

- secret management (`.env` must never contain committed real keys)
- attachment/path handling and file open behavior
- privacy UX around continuous app-context polling
- overlay CSP currently allows inline styles (hardening opportunity)

## 9) Known operational notes

- `docs/packaged-app-data-mismatch.md` documents a packaged-vs-dev data-path mismatch investigation and should be reviewed before release work.

## 10) Suggested reading order (new contributors)

1. `README.md`
2. `package.json`
3. `app-main.js`
4. `database.js`
5. `preload.js`
6. `renderer/renderer.js`
7. `renderer/capture.js`
8. `appWatcher.js`
9. `surfaceEngine.js`
10. `aiOrganize.js`
11. `overlay/overlay.js`
12. `docs/packaged-app-data-mismatch.md`

## 11) Suggested next improvements

- add integration tests for IPC + DB boundaries
- add E2E tests for capture -> surface -> open workflows
- add lint/typecheck scripts to CI
- strengthen secret scanning and pre-commit checks
- continue simplifying DB path/migration behavior for packaged builds

