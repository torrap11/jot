# Pakr Notes (PakrAI)

Local-first macOS notes app with AI-powered organization, continuous screen recording, proactive recall, and an in-app AI agent.

## 5 Standout Features

1. **Proactive Recall** — automatically surfaces relevant notes as an overlay when you switch apps, scored by link matches, keyword relevance, and time-of-day context
2. **Natural Language Remind Workflows** — "remind me to check deploy when I open Cursor" creates a linked note that triggers when you actually open that app
3. **AI Auto-Filing & Custom Prompts** — every note auto-files on save; batch-file or reorder notes with natural language prompts ("group personal vs work", "oldest first")
4. **Session-Grouped Screen History** — continuous screen recording grouped into browsable sessions by app with duration and activity summaries, queryable in natural language
5. **Pakr AI Agent + Global Shortcuts** — floating chat assistant with full notes tool access, plus system-wide shortcuts for instant control from any app

## Components

| Component | Description |
|-----------|-------------|
| **Notes** | Create, search, edit, attach images/files. Folder tree with drag-to-refile. |
| **Screen Recording** | Continuous laptop screen capture (no audio/camera). Toggleable. 7-day rolling retention. |
| **Proactive Recall** | App-switch watcher + surface engine + overlay popup with dismiss/snooze/save. |
| **Pakr AI Agent** | Floating chat window (⌘⇧P) with tool-call access to notes DB. |
| **AI Organization** | Auto-files notes on close, batch File Notes, NL display/sort prompts. |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘P` | Toggle notes window |
| `⌘N` | Quick capture (new note) |
| `⌘⇧N` | Compose new note in search window |
| `⌘⇧R` | Manual recall trigger |
| `⌘⇧P` | Open Pakr AI agent |
| `Escape` | Save and close note editor |

## Quick Start

```bash
cd jot
npm install
export SCREENPIPE_API_KEY=dev-key-123
npm start
```

From workspace root: `../scripts/run-dev.sh` (builds engine if needed).

## Tests

```bash
npm test
npm run preflight   # before release build
```

## Release Build

```bash
../scripts/build-engine.sh
npm run dist:arm64
```

Artifact: `dist/PakrAI-<version>.dmg`

## macOS Permissions

- **Screen Recording** — capture + query
- **Automation** — frontmost app detection for proactive resurfacing
- **Accessibility** — recommended for full UI element capture

## Docs

- [PakrAI manual QA](../docs/pakrai/manual-qa.md)
- [Technical deep dive](docs/repository-summary.md)
