# EasyJot: End Goal Summary

> One-page summary of the software and business goals. Full details in [dev-docs/](dev-docs/).

---

## Software End Goal

**EasyJot aims to become a Context-Triggered Intent Memory System**—not a note app or task manager, but a **right-time, right-context recall** layer that surfaces your intentions when they become actionable.

### The Problem

People form useful intentions ("ask Ben about the repo," "buy creatine when on Amazon," "watch Netflix in Chinese") and lose them as soon as they switch apps, open sites, or enter meetings. This is a **prospective memory** failure: the right cue never arrives at the right moment.

### The Solution

- **Keyboard-first capture** — Near-zero friction capture from any app (global hotkey)
- **Context triggers** — Recall when you open a specific app, domain, calendar meeting, or contact
- **Personal intent graph** — Semantic memory of what you intended, improving over time
- **AI-assisted recall** — "What should I ask Ben?" → relevant notes surfaced
- **Behavioral learning loop** — Feedback (act, snooze, dismiss) improves precision

### Target Architecture

Local-first client with: capture clients (desktop, mobile, browser extension), local event bus for context (app, domain, calendar, contact), encrypted intent store, AI layer (extraction, summarization, Q&A), trigger engine, non-intrusive surfacing.

---

## Business End Goal

**Credible path to $10M+ ARR** via subscription SaaS and a **prosumer → team → enterprise** revenue ladder.

### Pricing

- **Free** — Limited captures, habit formation
- **Pro** ($10–15/user/mo) — Unlimited capture, core triggers, AI, sync
- **Team** ($18–25/user/mo) — Shared contexts, intent templates
- **Enterprise** — SSO, compliance, policy controls

### Milestones

| Milestone | Route | Timeline |
|-----------|-------|----------|
| **$1M ARR** | ~7k Pro users or ~300 teams | Year 1–2 |
| **$10M ARR** | ~2k teams × 25 seats | Year 3 |
| **$50M ARR** | Workflow intelligence layer, 10k teams | Platform expansion |

### Defensibility

- Personal intent data graph (user-authored, high-signal)
- Behavioral learning loop (precision improves with feedback)
- Workflow context engine (permissioned, cross-platform, engineering moat)
- Capture habit and switching costs

### Acquisition Potential

Strategic value to Apple, Notion, Google, Microsoft, Meta when proven: high retention, reliable context triggers, scalable integrations, permissioned data collection.

---

## Current State vs. End Goal

| Aspect | Current (Easy Jot) | End Goal (EasyJot) |
|--------|-------------------|---------------------|
| Capture | Global hotkey, notes + images | Same + browser, mobile |
| Organization | Folders, AI search/organize | Intent graph, entity references |
| Recall | Manual (open app, search) | **Context-triggered** (app/domain/calendar/contact) |
| AI | Search, organize, keybind help | Extraction, summaries, recall Q&A, trigger proposals |
| Business | — | Pro/Team/Enterprise SaaS |
