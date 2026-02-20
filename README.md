# Easy Jot

A minimal sticky-note desktop app that lives behind a global hotkey.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

The app starts hidden in the background (no dock icon).

## Usage

- **Toggle window**: Press `Control + Option + Command + J`
- **New note**: Click the `+` button
- **Edit**: Click any note to open it
- **Auto-save**: Notes save automatically as you type
- **Delete**: Open a note and click "Delete"
- **Drag**: Drag the title bar to reposition the window

## Data

Notes are stored in a SQLite database at:
```
~/Library/Application Support/easy-jot/easy-jot.db
```

> **Upgrading from the previous Jot app?** If you had notes in the old app, copy `~/Library/Application Support/jot/jot.db` to `~/Library/Application Support/easy-jot/easy-jot.db` before first run.

## Easy Jot Agent — API Key Setup

The Easy Jot Agent feature uses an OpenAI-compatible LLM. You must supply an API key using **one** of these methods:

### Option 1 — Environment variable (recommended)

```bash
export EASY_JOT_OPENAI_API_KEY=sk-...
npm start
```

### Option 2 — Config file

Create `~/Library/Application Support/easy-jot/config.json`:

```json
{
  "openaiApiKey": "sk-..."
}
```

### Optional config fields

```json
{
  "openaiApiKey": "sk-...",
  "model": "gpt-4o-mini",
  "baseURL": "https://api.openai.com/v1"
}
```

| Field | Default | Notes |
|-------|---------|-------|
| `openaiApiKey` | — | Required for Easy Jot Agent |
| `model` | `gpt-4o-mini` | Any model supported by the endpoint |
| `baseURL` | OpenAI default | Set to use a compatible provider (e.g. Ollama, local inference servers) |
