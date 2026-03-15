# Milestone-Based Development Roadmap

> **Principle**: Simulate first, detect later. Decouple *trigger source* from *match-and-surface logic*. The same matching pipeline runs whether the trigger comes from a manual "Simulate Netflix" click or from a browser extension detecting netflix.com.

---

## Design: Trigger Source vs. Match Logic

```
[Trigger Source]                    [Match Logic]              [Surface]
     │                                    │                         │
     │  Manual: "Simulate Netflix"         │                         │
     ├────────────────────────────────────►│  Find notes linked to     │
     │  Browser: extension sees netflix   │  "netflix.com"           │
     ├────────────────────────────────────►│  → same logic            │
     │  App: accessibility sees Netflix   │                         │
     └────────────────────────────────────►│                         │
                                           └────────────────────────►│  Show panel/toast
                                                                      │  Dismiss/Snooze/Done
```

**Key**: Build the right-hand side (match + surface) first, fed by a *manual* trigger source. Swap in real detection later without changing the core.

---

## Milestone Overview

| Milestone | Focus | Trigger Source | Deliverable |
|-----------|-------|----------------|--------------|
| **M0** | Current state | — | Sticky notes, folders, AI search ✅ |
| **M1** | Manual trigger + keyword match | User types "netflix" | Simulate context → show matching notes |
| **M2** | Explicit note–trigger links | Same | User links note to "netflix.com" → only those show |
| **M3** | Surfacing UX | Same | Toast/panel, dismiss/snooze/done, "why this?" |
| **M4** | Real context detection | Browser / app | Same match logic, new trigger source |

---

## M1: Manual Trigger + Keyword Match

**Goal**: Validate the flow: *trigger → match → surface* using the simplest possible implementation.

**Scope**:
- Add a "Simulate context" control (e.g., Cmd+Shift+T or a button in the agent panel)
- User enters a context string: `netflix.com`, `Slack`, `Meeting with Ben`, etc.
- App treats this as a **context event**
- **Match**: Simple keyword search — show notes whose content contains the context string (case-insensitive)
- **Surface**: Show matching notes in the existing UI (e.g., agent panel results, or a dedicated "Triggered" section)

**Out of scope**: No explicit linking yet. No real detection. No fancy UX.

**Success**: User types "netflix" → sees notes that mention Netflix. Proves the pipeline works.

---

## M2: Explicit Note–Trigger Association

**Goal**: User can *link* a note to a trigger. Only linked notes surface when that trigger fires.

**Scope**:
- Data model: Add `trigger_pattern` (or similar) to notes — e.g., `netflix.com`, `slack`, `ben`
- UI: When editing a note, user can set "Show when: [pattern]" (optional)
- When manual trigger fires with context `X`, match notes where `trigger_pattern` matches `X` (exact or fuzzy)
- Fallback: If no notes have explicit triggers for `X`, optionally still show keyword matches (configurable)

**Out of scope**: No AI extraction of triggers from note content yet.

**Success**: User links note "watch in Chinese" to `netflix.com`. Simulates Netflix → only that note (and others linked to netflix) appears.

---

## M3: Surfacing UX + Feedback Loop

**Goal**: Non-intrusive surfacing and user feedback (dismiss, snooze, done).

**Scope**:
- **Surface**: When matches exist, show a small toast or slide-in panel (keyboard-dismissible)
- **Actions**: Dismiss (hide for now), Snooze (remind later), Done (mark as acted on)
- **Transparency**: "Why did I see this?" — show which trigger fired and which note(s) matched
- **Cooldown**: Don't re-surface the same trigger+note for N minutes (avoid notification fatigue)

**Out of scope**: No behavioral learning yet (just store outcome for future use).

**Success**: Simulate Netflix → toast appears with "watch in Chinese" → user can dismiss, snooze, or mark done. Clear explanation of why it showed.

---

## M4: Real Context Detection

**Goal**: Replace manual trigger with real context sources.

**Scope** (pick one to start):
- **Option A**: Browser extension — detects active tab URL/domain, sends to desktop app via native messaging
- **Option B**: macOS app detection — accessibility API or similar to detect frontmost app
- **Option C**: Calendar integration — detect "meeting started" via calendar API

**Key**: The context event format is the same. Manual trigger sends `{ type: "domain", value: "netflix.com" }`. Browser extension sends the same. Match logic is unchanged.

**Success**: User opens netflix.com in browser → extension sends event → app surfaces linked notes automatically. No manual "Simulate" needed.

---

## M5+ (Future)

- **M5**: AI extraction — "You mentioned Amazon — trigger on amazon.com?" from note content
- **M6**: Behavioral learning — use dismiss/snooze/done to improve precision
- **M7**: More trigger types — calendar, contact, location
- **M8**: Mobile companion, cloud sync, etc.

---

## Summary

| Step | What you build | What you learn |
|------|----------------|----------------|
| **M1** | Manual "Simulate X" → keyword match | Pipeline works; UX feels right |
| **M2** | Note ↔ trigger link | Explicit association beats keyword guess |
| **M3** | Toast, dismiss/snooze, "why?" | Surfacing UX; avoid fatigue |
| **M4** | Real detection (browser/app) | Same logic, new source — plug and play |

Each milestone is **independently shippable** and **testable** without the next. You can stop after M2 and still have a useful "manual context recall" tool.
