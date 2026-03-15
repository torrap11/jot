# Jot

A local-first, always-on-top desktop app for capturing and recalling intentions by voice.

Speak a reminder ("when I open Netflix, switch to Spanish audio"), and Jot stores it as a context-aware memory. Click the matching trigger later and Jot surfaces it — read back to you in a natural voice. Scheduled time-based reminders and an AI agent for organizing plain notes are also built in.

Built with Electron, SQLite, Smallest AI Waves (Pulse STT + Lightning TTS), and OpenAI.

---

## Quick Start

**Requirements**: Node.js 18+, macOS (Windows/Linux: Cmd → Ctrl shortcuts)

```bash
git clone <repo>
cd jot
npm install
```

Create the config file at `~/Library/Application Support/easy-jot/config.json`:

```json
{
  "openaiApiKey": "sk-...",
  "smallestAiKey": "your-smallest-ai-key"
}
```

```bash
npm start
```

The app hides in the background with no dock icon. Press **Cmd+E** to show it.

See [Configuration](#configuration) for all options and the [API key matrix](#api-keys) for what each key enables.

---

## What It Does

### Voice memory
Press `Cmd+Shift+J` anywhere → speak → review transcript → save. The LLM extracts a trigger context and category. Lightning TTS speaks a confirmation back.

### Context triggers
Click a trigger button (Netflix, LinkedIn, Gmail, Work) to simulate that app opening. Jot queries matching memories and reads them back via TTS. Designed for real auto-detection (see [Roadmap](docs/roadmap.md)).

### Scheduled reminders
Write `at 10 PM remind me to drink water` and press Back. Jot parses the time automatically, converts the note to a scheduled reminder, and fires it at the right time with a spoken notification.

### Notes and folders
Plain text and image notes with folder organization, autosave, and Cmd+Z undo. An AI agent accepts natural-language commands to search, create, and organize.

---

## Keyboard Shortcuts

### Global (work in any app)

| Shortcut | Action |
|---|---|
| `Cmd+E` | Show / hide Jot |
| `Cmd+Shift+J` | Start / stop voice recording |

### In-app

| Shortcut | Action |
|---|---|
| `Cmd+N` | New note |
| `Cmd+I` | New note from image file |
| `Cmd+S` | Save + open folder picker |
| `Cmd+Z` | Undo last delete |
| `Cmd+F` | Toggle folder organize view |
| `Cmd+J` | Focus / open AI agent panel |
| `Escape` | Contextual: note → list → folder view → close |
| `↑ / ↓` | Navigate note list |
| `Enter` | Open selected note |
| `Delete / Backspace` | Delete selected note (in list) |
| `Ctrl+Tab` | Cycle folder filter forward |
| `Ctrl+Shift+Tab` | Cycle folder filter backward |

---

## Configuration

Config is read from `~/Library/Application Support/easy-jot/config.json` on every API call. Environment variables take precedence.

```json
{
  "openaiApiKey":  "sk-...",
  "smallestAiKey": "...",
  "model":         "gpt-4o-mini",
  "useOllama":     false,
  "ollamaBaseURL": "http://localhost:11434/v1",
  "ttsVoice":      "emily",
  "ttsSampleRate": 24000,
  "sttLanguage":   "en"
}
```

| Key | Env var | Default | Description |
|---|---|---|---|
| `openaiApiKey` | `EASY_JOT_OPENAI_API_KEY` | — | OpenAI API key |
| `smallestAiKey` | `SMALLEST_AI_KEY` | — | Smallest AI key (STT + TTS) |
| `model` | — | `gpt-4o-mini` | LLM model for agent and intent parsing |
| `useOllama` | `EASY_JOT_USE_OLLAMA=1` | `false` | Use local Ollama instead of OpenAI |
| `ollamaBaseURL` | — | `http://localhost:11434/v1` | Ollama endpoint |
| `ttsVoice` | — | `emily` | Smallest AI voice ID |
| `ttsSampleRate` | — | `24000` | TTS audio sample rate |
| `sttLanguage` | — | `en` | STT language code (BCP-47) |

### API keys

| Feature | Provider | Key needed |
|---|---|---|
| Voice STT | Smallest AI Pulse (primary) | `smallestAiKey` |
| Voice STT | OpenAI Whisper (fallback) | `openaiApiKey` |
| TTS read-back | Smallest AI Lightning | `smallestAiKey` |
| AI agent + intent parsing | OpenAI GPT-4o-mini | `openaiApiKey` |
| AI agent (local, no cloud) | Ollama | none |

**Minimum for full demo**: both keys. TTS is optional — the app works without it but won't speak.

### Ollama (local LLM)

```bash
ollama pull llama3.2
```

Set `"useOllama": true` in config.json. Note: Ollama has no STT or TTS — voice features still need Smallest AI or OpenAI keys.

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full module map, IPC flow, and data models.

```
Main process (Node.js)
├── main.js          — window lifecycle, global shortcuts, 22 IPC handlers
├── database.js      — SQLite (better-sqlite3), 4 tables
├── llm.js           — OpenAI / Ollama client
├── config.js        — reads env + config.json on every call
├── voice.js         — Pulse STT → Whisper fallback
├── tts.js           — Lightning TTS, returns WAV buffer
├── intentParser.js  — LLM → structured { trigger, content, category }
├── triggerEngine.js — canonical trigger IDs and normalization
├── scheduler.js     — 30s poll for scheduled reminders
├── reminderParser.js — deterministic regex time parser
├── keybinds.js      — shortcut definitions (data only)
└── intelligence/
    └── executor.js  — action dispatcher (search, create, move, organize)

preload.js           — contextBridge: exposes window.api (contextIsolation: true)

Renderer (Chromium)
└── renderer/
    ├── index.html   — DOM structure
    ├── renderer.js  — all UI logic (~1400 lines)
    └── style.css    — sticky-note aesthetic
```

---

## Data Storage

```
~/Library/Application Support/easy-jot/
├── easy-jot.db      — SQLite database (WAL mode)
└── config.json      — API keys and settings (never commit this file)
```

Database tables: `notes`, `folders`, `intent_memories`, `scheduled_reminders`.

---

## Troubleshooting

**App doesn't appear**
Press `Cmd+E`. Check the terminal for startup errors.

**Microphone not working**
macOS: System Settings → Privacy & Security → Microphone → enable for Electron or your terminal.

**"No STT provider configured"**
Add `smallestAiKey` or `openaiApiKey` to config.json.

**TTS not speaking**
TTS requires `smallestAiKey`. Check the status bar at the top of the app.

**"No LLM configured"**
Add `openaiApiKey` to config.json, or set `"useOllama": true`.

**`npm install` fails (native module error)**
`better-sqlite3` requires native compilation. Make sure Xcode Command Line Tools are installed: `xcode-select --install`. The `postinstall` script runs `electron-rebuild` automatically.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Roadmap

See [docs/roadmap.md](docs/roadmap.md).

## Known Issues

See [docs/known-issues.md](docs/known-issues.md).
