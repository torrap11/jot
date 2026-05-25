# Jot P6 — Manual QA: Query screen recordings

**Phase:** P6  
**Spec:** [QUERY-RECORDINGS.md](./QUERY-RECORDINGS.md)

---

## Setup

1. Launch Jot (`npm start` in `jot/`).
2. Confirm engine status dot is green (recording) in the title bar.
3. Have at least a few minutes of screen activity captured.

---

## Test cases

### T1 — Tab navigation

| Step | Expected |
|------|----------|
| App launches | Notes tab is active; Notes panel is visible |
| Click **Recordings** tab | Recordings panel appears; search pane is shown by default |
| Click **Notes** tab | Notes panel returns; editor state preserved |

### T2 — Recordings Search (engine online)

| Step | Expected |
|------|----------|
| Click Recordings tab | Search pane visible; Search/Ask mode buttons shown |
| Type a word you saw on screen in the last 2h (e.g. "cursor") | — |
| Click **Search** | Results list shows snippets with app + timestamp badges |
| Change time range to "Last 24h" and search again | Results change accordingly |
| Type an app name in the App… field (e.g. "Cursor"), click Search | Results filtered to that app |
| Clear query, click Search | "No recordings yet" or first results from last 2h |

### T3 — Content type filter

| Step | Expected |
|------|----------|
| Click **Screen** chip | Filter active; only OCR/UI results returned |
| Click **All** chip | All types shown |

### T4 — Recordings Ask (engine online)

| Step | Expected |
|------|----------|
| Click **Ask** mode button | Ask pane shows; Search pane hides |
| Type "what was I working on?" and click Ask | Results show Notes + Memory + Recording sections with citations |
| Each result has a citation row | Shows app name and/or timestamp |

### T5 — Offline state

| Step | Expected |
|------|----------|
| Engine offline (stop it or disconnect) | Engine dot shows grey "offline" |
| Click Recordings tab | Offline state shown; mode buttons and panes hidden |
| Offline message mentions "start the engine" | Message is clear and actionable |
| Notes still work | Notes tab functions normally |

### T6 — Regression: Notes still work

| Step | Expected |
|------|----------|
| ⌘P opens search | Notes panel shown and focused |
| ⌘N opens capture | Capture window appears |
| Write and save a note | Note appears in results |

---

## Exit criteria

- [ ] T1: tab navigation works
- [ ] T2: search returns OCR text from a known recent window
- [ ] T3: type chips filter results
- [ ] T4: Ask returns cited spans from recordings + notes
- [ ] T5: offline state is clear; notes still work
- [ ] T6: notes features unaffected

**P6 exit:** dogfood query finds known on-screen text from last hour. ✅ (engine API confirmed in verify-stack.sh)
