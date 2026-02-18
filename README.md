# Jot

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
~/Library/Application Support/jot/jot.db
```
