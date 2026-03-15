# Roadmap

## Current State (shipped)

The full voice memory pipeline is working end-to-end:
- Voice capture → Pulse STT → LLM intent extraction → SQLite → Lightning TTS confirmation
- Manual context trigger simulation with TTS read-back
- Scheduled reminders (once/daily) with TTS notification
- Note + folder system with AI agent
- Smart note routing: text typed in the note editor auto-converts to a reminder or intent memory on Back based on content

---

## Design Principle: Trigger Source vs. Match Logic

The match-and-surface pipeline is decoupled from how triggers arrive. Adding real auto-detection (M4) requires no changes to matching or surfacing logic.

```
[Trigger Source]                [Match Logic]           [Surface]
  Manual button     ──────────► query memories   ──► overlay + TTS
  Browser extension ──────────► same logic       ──► same overlay
  macOS app watcher ──────────► same logic       ──► same overlay
```

---

## Milestones

### M0 — Foundation (done)
Note CRUD, folders, AI agent, keyboard shortcuts, SQLite persistence.

### M1 — Voice Memory (done)
Voice capture → STT → LLM intent extraction → context trigger memories → TTS read-back. Manual trigger simulation via UI buttons.

### M2 — Scheduled Reminders (done)
Natural-language time parsing ("at 10 PM", "every day at 9 AM", "in 30 minutes"). 30s scheduler poll. TTS reminder notification. Auto-conversion of note text to reminder on save.

### M3 — Real Context Detection
Replace the manual trigger buttons with automatic detection.

**Option A — macOS app watcher** (lowest friction to ship)
- Use `NSWorkspace` notifications via a native addon or periodic polling of `lsappinfo` / `osascript`
- When frontmost app changes to Netflix/LinkedIn/etc., fire the matching trigger automatically
- No browser required; works for any native app

**Option B — Browser extension**
- Chrome/Safari extension detects active tab URL/domain
- Sends event to Electron via `chrome.runtime.connectNative` (native messaging)
- Enables web-based triggers (netflix.com, mail.google.com, linkedin.com/in/...)
- Same trigger event format: `{ type: 'domain', value: 'netflix.com' }`

**Option C — Calendar integration**
- Poll Google/Apple calendar API for upcoming/started meetings
- Fire trigger on meeting start: `{ type: 'calendar', value: 'meeting_start', title: '...' }`

**Success criteria**: User opens Netflix app (or netflix.com) → trigger fires automatically with no manual interaction.

### M4 — Snooze, Done, Cooldown
Currently triggers show and auto-dismiss. Add:
- **Snooze**: re-surface the same memory after N minutes
- **Done**: mark memory as acted on (hide from future triggers)
- **Cooldown**: don't re-surface the same trigger+memory combo for N minutes
- **Why did I see this?**: show which trigger fired and which memory matched

### M5 — Semantic Search and Embeddings
- Embed intent memories with `text-embedding-3-small` on save
- Match triggers by cosine similarity in addition to exact trigger ID
- Fill the `embedding` column in `intent_memories` (currently reserved)
- Enable "show me everything related to my Netflix watching" queries in the agent

### M6 — Behavioral Learning
- Track dismiss/snooze/done outcomes per memory
- Surface higher-confidence memories first (fewer false positives over time)
- Weekly review summary: "You acted on 3/5 Netflix memories. 2 were snoozed repeatedly — remove?"

### M7 — Sync and Mobile
- Encrypted SQLite sync across devices (iCloud or self-hosted)
- iOS companion app: capture only (voice, text), notifications when triggers fire on desktop

---

## Non-Goals (current scope)

- **No real-time collaboration**: this is a personal tool
- **No cloud processing**: intent extraction and reminder logic run locally
- **No surveillance features**: only user-initiated context events; no ambient recording beyond explicit voice capture
