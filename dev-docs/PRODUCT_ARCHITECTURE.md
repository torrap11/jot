# Product Architecture (Target State)

> **Source**: Organized from `deep-research-report (1).md`. This describes the *target* architecture. Current implementation is a simpler sticky-note app—see PROJECT_CONTEXT.md.

---

## High-Level System Architecture

**Local-first client** with optional cloud sync:

```
Capture → Intent object → AI enrichment (optional) → Indexed memory
    → Context event occurs → Match → Surface prompt
    → User action/feedback → Model updates
```

### Components

1. **Capture clients** — Desktop (global shortcut), mobile, browser extension
2. **Local event bus + context collector** — Frontmost app, window metadata, browser tab URL, calendar meeting start, optionally location
3. **Encrypted local store** — Intent database; cloud optional for sync/backups
4. **AI layer (hybrid)** — On-device embeddings; model-assisted transformations (summaries, task extraction, suggested triggers)
5. **Trigger engine** — Rules + similarity matching; evaluates context events against triggers
6. **Presentation layer** — Non-intrusive surfacing; keyboard-first dismiss/snooze/done

---

## Data Model (Core Objects)

| Object | Fields |
|--------|--------|
| **Intent** | id, raw_text, normalized_text, created_at, status (active/done/snoozed), confidence, priority, tags |
| **TriggerDefinition** | type (app\|domain\|calendar\|contact\|location), pattern, constraints, cooldown, expires_at |
| **ContextEvent** | timestamp, app_id, window_title_hash, domain, meeting_id, contact_hash, location_cell, device |
| **Entity references** | Extracted people/project/tool references; hashed or user-confirmed |
| **Outcome** | intent_id, triggered_at, action_taken, latency_to_action (behavioral learning loop) |

---

## AI Components

- **Extraction** — Identify tasks, people, places, websites, apps, temporal hints; propose triggers ("you mentioned Amazon—trigger on amazon.com?")
- **Summarization** — Weekly review summaries from intent captures
- **Recall Q&A** — "What should I talk about with Ben?" → retrieval across entity references
- **Reminder synthesis** — Vague intentions → specific next actions + context hook

---

## Trigger Detection (By Platform)

| Platform | Feasibility |
|----------|-------------|
| **macOS/Windows** | App/foreground-window triggers, global shortcuts; macOS may require accessibility trust |
| **Android** | Usage stats; requires transparency and user-enabled access |
| **iOS** | Constrained; treat as companion (capture, location where allowed, notification actions, calendar hooks) |

---

## Privacy and Compliance

- **Local-first by default** with end-to-end encryption for sync
- **Context minimization** — Store only what's needed (e.g., domain strings); user-configurable exclusions
- **Transparency UI** — "Why did I see this?" explanation
- **Export/delete** as first-class features
- **Platform rules** — Apple requires user consent and clear indication when recording/logging user activity
