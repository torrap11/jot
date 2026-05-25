# Jot

Local-first macOS notes app with AI-powered organization, proactive recall, and an in-app AI agent.

> **Screen Engine Status:** 🚧 The screen recording engine is under construction and not available in this release. Notes, folders, AI filing, and Jot AI all work fully. Screen recording is coming soon.

## Features

1. **Proactive Recall** — automatically surfaces relevant notes as an overlay when you switch apps, scored by link matches, keyword relevance, and time-of-day context
2. **Natural Language Remind Workflows** — "remind me to check deploy when I open Cursor" creates a linked note that triggers when you actually open that app
3. **AI Auto-Filing & Custom Prompts** — every note auto-files on save; batch-file or reorder notes with natural language prompts ("group personal vs work", "oldest first")
4. **Jot AI Agent** — floating chat assistant (⌘⇧P) with full notes tool access for reorganizing, searching, and managing your notes
5. **Global Shortcuts** — system-wide shortcuts for instant capture and recall from any app

## Components

| Component | Description |
|-----------|-------------|
| **Notes** | Create, search, edit, attach images/files. Folder tree with drag-to-refile. |
| **Screen Recording** | 🚧 Under construction. Continuous laptop screen capture (no audio/camera). |
| **Proactive Recall** | App-switch watcher + surface engine + overlay popup with dismiss/snooze/save. |
| **Jot AI Agent** | Floating chat window (⌘⇧P) with tool-call access to notes DB. |
| **AI Organization** | Auto-files notes on close, batch File Notes, NL display/sort prompts. |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘P` | Toggle notes window |
| `⌘N` | Quick capture (new note) |
| `⌘⇧N` | Compose new note in search window |
| `⌘⇧R` | Manual recall trigger |
| `⌘⇧P` | Open Jot AI agent |
| `Escape` | Save and close note editor |

## Quick Start

```bash
cd jot
npm install
export SCREENPIPE_API_KEY=dev-key-123
npm start
```

## Tests

```bash
npm test
npm run preflight   # before release build
```

## Release Build

```bash
npm run dist:arm64
```

Artifact: `dist/Jot-<version>.dmg`

## macOS Permissions

- **Automation** — frontmost app detection for proactive resurfacing
- **Accessibility** — recommended for full UI element capture
- **Screen Recording** — 🚧 under construction (not required for current release)
