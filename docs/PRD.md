# PRD — Jot × Screenpipe (Proactive Recall)

**Status:** Draft  
**Last updated:** 2026-05-18  
**Owner:** parthha12  
**Workspace:** `screenpipe-x-jot` (`engine/`, `jot/`, `integration/`)

---

## 1. Executive summary

Build **one local-first macOS app** (shipped as **Jot**) that combines:

1. **Screenpipe** — continuous desktop memory (Record, Rewind, Ask) via the Rust engine.
2. **Jot** — fast notes, capture, and workflow-linked reminders.
3. **Proactive recall** — research-backed resurfacing that shows the *right* memory at the *right* moment, and stays **silent** when uncertain.

**One-line product:** *AI-ready desktop memory that captures everything locally, and proactively surfaces what matters—notes and past screen context—without you asking.*

---

## 2. Problem

| Pain | Today |
|------|--------|
| Context is scattered | Notes live in Jot; screen/audio history lives in Screenpipe; no unified resurfacing. |
| Proactive tools over-notify | Jot can show up to 3 notes on every app switch with weak gating. |
| Memory tools under-notify or require prompts | Screenpipe requires search/Ask; proactive recall is spec’d but not productized in Jot. |
| Two apps, two permissions, two mental models | Users must run and trust two separate experiences. |

---

## 3. Vision & goals

### 3.1 Vision

**Proactive recall = right memory × right moment × fast enough × often silent × user still in control.**

The app is an ambient layer: it records locally, retrieves deterministically, and intervenes only when evidence is strong.

### 3.2 Goals (ordered)

| # | Goal | Success signal |
|---|------|----------------|
| G1 | **Unified product** | User installs one app; no separate Screenpipe UI required for daily use. |
| G2 | **Full Screenpipe capability** | Record, Rewind, Ask work inside Jot (engine as substrate). |
| G3 | **Research-aligned resurfacing** | Tri-state policy (Surface / Defer / Silence), caps, why-now, one card. |
| G4 | **Merged candidates** | Notes + captured episodes compete under the same policy. |
| G5 | **Trust & restraint** | Default silence; meeting/focus suppression; per-app opt-out. |
| G6 | **Local-first** | No cloud required; optional Anthropic for non-hot-path helpers only. |

### 3.3 Non-goals (v1)

- Cloud sync, multi-device, team sharing
- LLM on the proactive hot path
- Replacing `/search` or MCP architecture
- Cross-platform parity before macOS is solid
- Chat/assistant-first UI
- Rewriting capture pipelines in Node/Electron

---

## 4. Users & personas

| Persona | Need |
|---------|------|
| **Knowledge worker** | Switch apps constantly; wants notes + “what was I doing here last time?” without searching. |
| **Founder / IC** | Captures meetings and decisions; wants calm nudges, not notification spam. |
| **Power user** | Manual recall, dry-run debug, caps tuning; may use API/CLI later. |
| **Privacy-conscious user** | Local-only, opt-out per app, silence by default. |

**Primary platform:** macOS (Apple Silicon + Intel universal builds).

---

## 5. Product principles

1. **Silence is the default** — Surface is earned; uncertain → Silence or Defer.
2. **Stability over features** — Engine reliability before new surfaces.
3. **Respect the machine** — 24/7 capture targets &lt;20% CPU, &lt;3GB RAM (Screenpipe bar).
4. **No mystery AI on interrupt** — Why-now is template-based, auditable chips.
5. **One card, non-modal** — No stacks, no sounds.
6. **User control** — Dismiss, snooze, never-this-app; manual recall bypasses auto suppression.
7. **Progressive disclosure** — Hot path: events → context → FTS → policy → UI.

*Source: `engine/VISION.md`, `docs/engine/reference/PRODUCT.md`, `docs/engine.md`.*

---

## 6. Core user journeys

### 6.1 Record (ambient)

- User installs Jot → onboarding grants Screenpipe capture permissions + Jot Automation (frontmost app).
- Engine runs as managed sidecar; tray/status shows recording state.
- Data stays on device in Screenpipe SQLite.

### 6.2 Rewind & Ask (intentional)

- **Rewind:** Timeline / search over screen, audio, UI text — inside Jot.
- **Ask:** Natural-language query across **notes DB + capture FTS** (not notes-only).

### 6.3 Capture (Jot, retained)

- ⌘N global capture; `remind me … when i open &lt;app&gt;`; folders, attachments, optional Anthropic organize/night (off hot path).

### 6.4 Proactive recall (new behavior)

**Trigger:** `AppSwitch` (300 ms settle) or `Manual`.

**Flow:**

```
AppSwitch / Manual
  → Build RecallContext (app, title, domain, document, visible excerpt, previous app)
  → Retrieve candidates (FTS passes + linked Jot notes)
  → Policy: Surface | Defer | Silence
  → If Surface: one overlay card + why-now chips
  → Persist every decision (including Silence)
```

**Example workflows (not possible with either app alone):**

1. Open client Notion doc → Jot checklist + “last time on this doc you left off at pricing” with `same document` / `last seen 2d ago`.
2. Rapid Slack ↔ IDE switching → silence on weak matches; surface only on strong multi-anchor evidence.
3. Medium match in Figma → **Defer**; return to same file → **Surface**.
4. Zoom auto-suppressed → **Manual recall** still returns meeting note + prior call context from capture.
5. Old note → **Rewind** to screen timeline when note was written.
6. “What did I promise Sarah?” → Ask across notes + transcripts/screen text.
7. Chrome PR workflow → match domain/title, not just `com.google.Chrome`.
8. Banking app → never auto-surface; capture/search optional; manual only.

---

## 7. Functional requirements

### 7.1 Engine & lifecycle (`integration/` + Jot main)

| ID | Requirement | Priority |
|----|-------------|----------|
| E1 | Jot spawns/monitors `screenpipe` binary; health check `GET /health` | P0 |
| E2 | Restart/backoff on crash; surface degraded state in UI | P0 |
| E3 | Bundle engine in release artifact (single `.dmg`) | P1 |
| E4 | Unified onboarding for TCC + Automation | P0 |

### 7.2 Record / Rewind / Ask (Jot UI → `:3030`)

| ID | Requirement | Priority |
|----|-------------|----------|
| M1 | Search UI calls `/search`, `/memories`, `/activity-summary` per API skill | P0 |
| M2 | Rewind/timeline view for frames and time ranges | P1 |
| M3 | Ask panel queries capture + notes (merged results) | P1 |
| M4 | Auth header for local API (`SCREENPIPE_LOCAL_API_KEY`) | P0 |

### 7.3 Proactive recall — backend (`engine`)

| ID | Requirement | Priority |
|----|-------------|----------|
| R1 | `screenpipe-recall`: `RecallContext` from live app-switch data | P0 |
| R2 | Retrieval: FTS passes per `POLICY.md` (app → domain/doc → manual fallback) | P0 |
| R3 | `RecallPolicy::evaluate` → Surface \| Defer \| Silence | P0 |
| R4 | Confidence formula + ≥2 anchor classes for auto Surface | P0 |
| R5 | Cooldowns/caps per `POLICY.md` defaults | P0 |
| R6 | Persist all decisions to `recall_events` | P0 |
| R7 | Routes: `GET /recall/status`, `POST /recall/evaluate`, `POST /recall/action`, `GET /recall/stream` (SSE) | P0 |
| R8 | Meeting mode + focus mode suppression (manual bypass) | P1 |
| R9 | Note candidates merged into retrieval/ranking | P1 |

*Spec refs: `docs/engine/reference/{API,POLICY,SCHEMA,ARCHITECTURE}.md`, `docs/engine/reference/ACCEPTANCE.md`.*

### 7.4 Proactive recall — Jot UI

| ID | Requirement | Priority |
|----|-------------|----------|
| U1 | Replace `pickSurfacedNotes` “show 3” with policy outcome (0 or 1 card) | P0 |
| U2 | Overlay: snippet, why-now chips, dismiss / snooze / never-this-app | P0 |
| U3 | Global shortcut for manual recall | P0 |
| U4 | App-switch: 300 ms settle (align watcher with research) | P1 |
| U5 | Subscribe to `/recall/stream` or poll evaluate on switch | P0 |
| U6 | Log surface actions back via `POST /recall/action` | P0 |

### 7.5 Jot notes (retain, extend)

| ID | Requirement | Priority |
|----|-------------|----------|
| N1 | Existing capture, search, folders, attachments, ⌘P/⌘N | P0 |
| N2 | App links + keyword scan remain inputs to candidate set | P0 |
| N3 | Optional Anthropic organize/night unchanged (not on hot path) | P2 |

---

## 8. Non-functional requirements

| Category | Target |
|----------|--------|
| **Hot-path latency** | &lt;500 ms evaluate (warm DB) |
| **App-switch settle** | 300 ms after switch before evaluate |
| **Availability** | Engine crash must not crash Jot UI |
| **Privacy** | Local-only; no LLM on hot path; never-this-app honored |
| **Interruption budget** | Defaults: 2 min global cooldown, 1/hr per app, 6 global surfaces/day |
| **UX** | One visible card; no sound; non-modal |
| **Testing** | `cargo test -p screenpipe-recall`; Jot `npm test`; ≥1 integration test on policy |
| **Docs** | `manual-qa.md`, curl examples in README |

---

## 9. System architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Jot (Electron) — product shell                             │
│  • Capture / Search / Settings                              │
│  • Overlay (1 recall card)                                  │
│  • Engine lifecycle (integration/)                          │
└───────────────┬─────────────────────────────┬───────────────┘
                │ HTTP/SSE :3030              │ SQLite (notes)
                ▼                             ▼
┌───────────────────────────┐     ┌──────────────────────────┐
│ screenpipe-engine         │     │ Jot notes DB             │
│ + screenpipe-recall       │     │ (better-sqlite3)         │
│ + screenpipe-db (FTS)     │     └──────────────────────────┘
└───────────────┬───────────┘
                │
                ▼
┌───────────────────────────┐
│ screenpipe-events         │
│ AppSwitch, capture        │
└───────────────────────────┘
```

**Repo ownership**

| Repo | Owns |
|------|------|
| `engine/` | Engine, recall crate, migrations, `/recall/*`, research prompts |
| `jot/` | Electron UI, notes DB, overlay, shortcuts |
| `integration/` | Sidecar manager, shared types/policy client, event contracts |

---

## 10. Policy summary (v1 defaults)

*Full spec: `engine/docs/engine/reference/POLICY.md`.*

- **Auto Surface:** confidence ≥ 0.78 **and** ≥ 2 anchor classes.
- **Defer:** medium confidence; recheck on next eligible trigger (24 h expiry).
- **Silence:** default when cold start, caps, cooldowns, meeting/focus, low confidence.
- **Anchors:** same app, exact document basename, same domain, title overlap, visible-text overlap.
- **Why-now (no LLM):** e.g. `same app`, `same document name`, `same site/domain`, `last seen 2h ago`, `manual recall`.

---

## 11. Phases & milestones

### Phase 0 — Foundation (current → 2 weeks)

- [ ] `integration/`: spawn engine, health, API key wiring
- [ ] Jot manual “recall” calls `POST /recall/evaluate` (dry-run OK)
- [ ] Document dev setup in workspace README

**Exit:** Engine runs from Jot dev build; curl evaluate works.

### Phase 1 — Recall backend (2–4 weeks)

- [ ] Implement `screenpipe-recall` per prompts `02`–`07`
- [ ] Acceptance checklist through API routes (no Tauri card required yet)

**Exit:** All items in `ACCEPTANCE.md` except Tauri card; Jot can consume SSE/evaluate.

### Phase 2 — Jot resurfacing alignment (2–3 weeks)

- [ ] Policy-driven overlay (1 card, why-now, actions)
- [ ] Note candidates in retrieval
- [ ] Deprecate “always show 3 linked notes” behavior
- [ ] 300 ms settle + caps enforced

**Exit:** Dogfood on daily Mac; manual QA doc signed.

### Phase 3 — Memory UX in Jot (4–6 weeks)

- [ ] Search / Rewind / Ask panels in Jot
- [ ] Single onboarding + tray model
- [ ] Bundle engine in release `.dmg`

**Exit:** User need not open Screenpipe Tauri app for core verbs.

### Phase 4 — Polish & ship (ongoing)

- [ ] Perf profiling on 24/7 capture
- [ ] Notarized release pipeline
- [ ] Defer batching, focus toggle, debug status UI

---

## 12. Success metrics

| Metric | Target (90 days post-beta) |
|--------|----------------------------|
| **Activation** | ≥60% complete onboarding + 24h recording |
| **Proactive quality** | &lt;10% of auto-surfaces dismissed within 5s |
| **Silence rate** | ≥80% of AppSwitch evaluates → Silence (healthy restraint) |
| **Manual recall use** | ≥20% of weekly active users use manual ≥1×/week |
| **Retention** | D7 ≥40% for beta cohort |
| **Performance** | p95 evaluate &lt;500 ms; no sustained &gt;20% CPU |

---

## 13. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Electron + Rust sidecar complexity | Phase 0 lifecycle hardening; CI smoke tests |
| Over-notification regresses trust | Policy-first; caps; dogfood with Silence logging |
| macOS permissions fragility | Unified onboarding; documented quarantine/signing path |
| Scope creep (full Screenpipe UI port) | Phase gates; P0 = recall + notes; Rewind/Ask P1 |
| Parallel agents breaking repos | No `git reset`; small PRs per phase |
| Policy stub never ships | Acceptance.md as release gate |

---

## 14. Open questions

1. **Brand:** Ship as “Jot” only, or “Jot powered by Screenpipe”?
2. **Notes DB:** Merge into Screenpipe SQLite long-term, or stay dual-DB with federation?
3. **Policy implementation:** Rust canonical + Jot HTTP client (recommended) vs JS port in `integration/` for offline notes-only mode?
4. **Tauri app:** Deprecate `screenpipe-app-tauri` for consumers, or keep for power users?
5. **Pricing / EE:** Any enterprise SDK surfaces in scope?

---

## 15. References

| Document | Path |
|----------|------|
| Research report | `engine/docs/engine.md` |
| Build pipeline | `engine/docs/engine/prompts/00-START.md` |
| Product / policy / API | `engine/docs/engine/reference/` |
| Acceptance | `engine/docs/engine/reference/ACCEPTANCE.md` |
| Jot overview | `jot/docs/jot-overview.md` |
| Workspace README | `README.md` |

---

## 16. Approval

| Role | Name | Date |
|------|------|------|
| Product | | |
| Engineering | | |
