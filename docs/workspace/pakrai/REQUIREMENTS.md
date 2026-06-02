# PakrAI — requirements

**Scope:** [SCOPE.md](./SCOPE.md). Prefixes: **P** product, **N** notes, **Q** query recordings, **R** resurfacing, **A** Pakr, **C** context.

---

## P — Product shell

| ID | Requirement | Pri |
|----|-------------|-----|
| P1 | PakrAI / Pakr branding | P0 |
| P2 | Single `.dmg` bundles notes app + engine | P1 |
| P3 | Onboarding: Screen Recording + Automation (+ Accessibility recommended) | P0 |
| P4 | Recording status visible; engine health in UI | P0 |
| P5 | Engine auto-start default on (`SCREENPIPE_ENABLED` true) | P0 |

---

## N — Notes

| ID | Requirement | Pri |
|----|-------------|-----|
| N1–N7 | (unchanged) capture, ⌘P, folders, time NL, app links | per SCOPE |

---

## Q — Query screen recordings

See [QUERY-RECORDINGS.md](./QUERY-RECORDINGS.md).

| ID | Requirement | Pri |
|----|-------------|-----|
| Q1 | Engine sidecar; `GET /health` | P0 |
| Q2 | Recordings **search** UI → `/search` | P0 |
| Q3 | Offline/degraded state when engine down | P0 |
| Q4 | Recordings **ask** (NL over capture FTS/memories) | P1 |
| Q5 | Optional blend: show note hits + recording hits in separate sections | P1 |
| Q6 | `SCREENPIPE_API_KEY` on API calls | P0 |
| Q7 | No microphone capture in v1 | P0 |
| Q8 | Jump-to-time or snippet detail from result | P1 |

---

## R — Resurfacing (notes-first on overlay)

| ID | Requirement | Pri |
|----|-------------|-----|
| R1 | Context resurfacing; overlay candidates **notes-first** | P0 |
| R2–R8 | One card, why-now, manual recall, no LLM on path, time, caps, log | per RESURFACING.md |

---

## C — Work context

| ID | Requirement | Pri |
|----|-------------|-----|
| C1 | Frontmost app (Automation) | P0 |
| C2 | Window title when available | P1 |
| C3 | Match notes via app_links, tags, FTS | P0 |
| C4 | Capture OCR may enrich **query** and future context—not required for v1 overlay LLM | P1 |

---

## A — Pakr agent (notes only)

| ID | Requirement | Pri |
|----|-------------|-----|
| A1–A6 | Pakr panel; notes DB tools; confirm; no hot path | per PAKR-AGENT.md |

Query recordings uses **Recordings ask**, not Pakr, unless later merged by design.

---

## S — Note search

| ID | Requirement | Pri |
|----|-------------|-----|
| S1–S4 | FTS, snippets, recents | P0/P1 |

---

## E — Engine

| ID | Requirement | Pri |
|----|-------------|-----|
| E1 | Spawn/monitor engine; restart on crash | P0 |
| E2 | Crash must not kill Electron | P0 |
| E3 | `cargo test -p screenpipe-recall` when recall routes used | P1 |
| E4 | `npm test` in jot | P0 |

---

## Non-functional

| Category | Target |
|----------|--------|
| Query search | p95 &lt; 2s warm FTS |
| Proactive evaluate | p95 &lt; 500 ms |
| Capture | Respect Screenpipe perf bar (&lt;20% CPU goal on release) |
| Privacy | Local-only default |

---

## Traceability

| Area | Code |
|------|------|
| Notes | `jot/db.js`, renderer, capture |
| Query | `integration/screenpipeClient.js`, `renderer.js` Rewind/Ask |
| Engine | `integration/engineManager.js`, `engine/target/release/screenpipe` |
| Overlay | `jot/overlay/`, `recallWatcher.js` |
| Pakr | `jot/pakr/` (new) |
