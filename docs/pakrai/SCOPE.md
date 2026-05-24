# PakrAI — product scope

**Read this before any other PakrAI doc.**

---

## In scope

| # | Outcome | What the user gets |
|---|---------|-------------------|
| 1 | **Capture notes** | Write notes while working (⌘N, library, folders, attachments) |
| 2 | **Understand notes** | Local index on note text + metadata for search and resurfacing |
| 3 | **Search notes** | Fast ⌘P + library |
| 4 | **Screen recording** | Continuous **laptop screen** capture only (no mic, no camera) while PakrAI runs |
| 5 | **Query recordings** | Search and ask questions over what was on screen (text/OCR index)—on demand, not on every app switch |
| 6 | **Resurface — time** | NL schedule → note comes back at that time |
| 7 | **Resurface — context** | Right **note** when work context matches (app, links, tags); overlay stays note-first |
| 8 | **Pakr agent** | Chat to reorganize **notes** when you ask |
| 9 | **Calm overlay** | ≤1 proactive card; dismiss / snooze / never-this-app |

**Proactive resurfacing** = mostly **notes** + work context (app/title). **Query recordings** = intentional—you open search/ask when you want screen history.

---

## Out of scope (v1)

| Excluded | Notes |
|----------|--------|
| **Microphone / voice** | No meeting transcription as a PakrAI pillar |
| **Camera** | No webcam capture |
| **Screenpipe-as-separate-app** | No requirement to use Tauri Screenpipe daily; engine is embedded in PakrAI |
| **LLM on proactive hot path** | App switch → card stays deterministic |
| **Cloud sync, teams, MCP pipes** | Later |
| **Chat-first home screen** | Notes + query are primary; Pakr for reorg |

---

## Permissions (v1)

| Permission | Needed? | Why |
|------------|---------|-----|
| **Screen Recording** | **Yes** | Desktop capture for query |
| **Automation** | Yes | Frontmost app (resurfacing + context) |
| **Accessibility** | Recommended | Window titles, richer OCR context |
| **Microphone** | No (v1) | Out of scope |

---

## Data

| Store | Contents |
|-------|----------|
| Notes SQLite (`jot/`) | Notes, folders, links, `resurface_at`, resurface log |
| Capture SQLite (engine) | Frames, OCR/UI text, FTS for **query recordings** |

Dual DB is OK. Proactive overlay candidates remain **notes-first**; query panel reads capture DB via engine `:3030`.

---

## Success = five verbs

1. **Capture** — save a note  
2. **Find** — search notes  
3. **Query** — search/ask your screen recordings  
4. **Resurface** — time or context brings a note back  
5. **Reorganize** — Pakr cleans up notes  

Screen recording exists to support **Query**, not to replace notes as the hero.
