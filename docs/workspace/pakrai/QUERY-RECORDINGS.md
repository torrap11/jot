# PakrAI — query screen recordings

**Scope:** [SCOPE.md](./SCOPE.md). Screen recording is **in**; microphone/camera are **out**.

---

## Purpose

PakrAI records the screen locally so you can **look up what you were doing** when a note is not enough. This is **intentional retrieval**—not the same as proactive note resurfacing.

**User stories:**

- “What was on screen when I wrote this note?”
- “Find the Slack thread about pricing from Tuesday.”
- “What did I change in that Figma file last week?”

---

## UX (PakrAI shell)

Expose as a clear surface in the main app—not buried dev tabs:

| Surface | Behavior | Priority |
|---------|----------|----------|
| **Recordings search** | Keyword/time/app filters over OCR text; results as snippets + timestamps | P0 |
| **Recordings ask** | NL question → ranked spans from capture (+ optional LLM synthesis); cite time/app | P1 |
| **Status** | Recording on/off, engine health dot | P0 |

**Naming in UI:** “Recordings” or “Screen query”—not “Screenpipe.” Legacy **Rewind** / **Ask** tabs in `jot/renderer/` are the starting implementation; rebrand and polish for PakrAI P0/P6.

**Shortcuts (suggested):** ⌘⇧F focus recordings search; keep existing patterns if already wired.

---

## Backend

| Piece | Role |
|-------|------|
| `integration/engineManager.js` | Spawn/monitor `screenpipe` binary |
| `integration/screenpipeClient.js` | HTTP to `localhost:3030` |
| Engine APIs | `GET /search`, `GET /memories`, activity endpoints per screenpipe-api skill |

Auth: `SCREENPIPE_API_KEY` / local API key header.

**Do not** reimplement capture in Electron—use the Rust engine.

---

## Query modes

### 1. Search (deterministic, P0)

- User types query + optional time range / app filter  
- Call `/search` (and related) → list of `{ timestamp, app, snippet, frame ref? }`  
- Click result → jump to time (timeline or detail panel if present)  

No LLM required for basic search.

### 2. Ask (P1)

- User asks in natural language  
- Retrieve candidates via FTS/memories APIs  
- Optional: LLM summarizes with citations (off hot path; user-initiated)  
- May blend **note** hits in same panel (“notes + recordings”) with clear sections  

### 3. Link to notes (P2)

- From open note: “show screen around when I wrote this” → query capture ±N minutes of `note.created_at`  
- From recording hit: “attach to note” or open linked note if exists  

---

## Relationship to resurfacing

| | Proactive overlay | Query recordings |
|--|-------------------|------------------|
| Trigger | App switch / time | User opens panel |
| Candidates | **Notes** first | **Capture** FTS |
| LLM | No | Optional in Ask only |
| Goal | Nudge without asking | Answer when you ask |

Capture may **inform** context resurfacing later (e.g. same document name from OCR)—but v1 overlay stays note-first per [RESURFACING.md](./RESURFACING.md).

---

## Requirements trace

| ID | Requirement | Pri |
|----|-------------|-----|
| Q1 | Engine runs with app; Screen Recording permission in onboarding | P0 |
| Q2 | Recordings search UI → `/search` | P0 |
| Q3 | Degraded UI when engine offline (notes still work) | P0 |
| Q4 | Recordings ask UI → memories/search blend | P1 |
| Q5 | Bundle engine in release `.dmg` | P1 |
| Q6 | No microphone capture in v1 | P0 |

---

## Implementation refs (existing)

- `jot/renderer/index.html` — Rewind / Ask tab bar  
- `jot/renderer/renderer.js` — `runRewindSearch`, `runAsk`  
- `jot/preload.js` — `screenpipeSearch`, `screenpipeMemories`  
- `integration/screenpipeClient.js`  

**P6 phase** in [PHASES.md](./PHASES.md): rebrand tabs, polish empty states, document in manual QA.

---

## Acceptance

1. With engine running, search returns OCR text from a known recent window.  
2. Engine stopped → search panel shows clear offline state; notes still work.  
3. Ask (P1) returns at least one cited snippet for a known query.  
4. Proactive overlay does not fire LLM on app switch.  
5. Screen Recording permission requested once in onboarding.
