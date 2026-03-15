# EasyJot Vision: Context-Triggered Intent Memory System

> **Source**: Organized from `deep-research-report (1).md`. This document defines the product vision and strategic direction.

---

## Executive Summary

EasyJot is a **keyboard-first "intent capture + recall" system** designed to solve a specific failure mode of modern digital work: people form useful intentions, then lose them as soon as they enter (or switch between) apps, websites, meetings, and communications channels.

The product's core promise is not "better notes" or "better tasks," but **right-time, right-context recall**—surfacing the user's own intentions *at the moment they become actionable* (e.g., when a relevant site opens, a meeting begins, a contact is called, or a workflow is resumed).

The underlying human problem is **prospective memory**—remembering to execute an intended action later, often while occupied with other tasks. EasyJot's strategic bet is that **software can operationalize prospective-memory cueing** across digital environments in a way mainstream note and task tools do not.

---

## Problem Definition

EasyJot targets the gap between *forming an intention* and *executing it*, particularly when execution depends on re-entering a future context:

- "When I open X…"
- "When I talk to Y…"
- "When I'm in meeting Z…"

Cognitive science frames this as **prospective memory**: successful completion requires recognizing that an opportunity has arrived (a cue) while attention is allocated elsewhere. In real work environments, attention is continuously fragmented by interruptions and rapid project switching, creating a hostile environment for reliable intention recall.

Critically, the "right" reminder is not always time-based; it is often **event- and context-based**. Research on **implementation intentions** ("If situation Y occurs, then I will do X") indicates that specifying the cue-action link can improve goal enactment—essentially formalizing the same mechanism software can operationalize through triggering.

---

## Why Existing Tools Fail

| Tool | Strength | Gap for Intent Recall |
|------|----------|------------------------|
| **Notion** | All-in-one workspace, embedded AI | Pull-based; user must remember to open, search, navigate |
| **Apple Reminders** | Time/location alerts | No digital workflow triggers (app open, website, contact) |
| **Todoist** | Fast task capture, reminders | Core object is "task"; not designed for context-based intentions |
| **Raycast** | Keyboard-first, extensions | Command invocation, not persistent intent recall |
| **Mem** | AI organization, semantic retrieval | "Related content" ≠ explicit context triggers across apps/sites/meetings |
| **Rewind/Limitless** | Broad capture, search | Fragile permissions; sunsetting; surveillance concerns |

---

## Category Definition

**Intent Memory System**: A personal system that (a) captures intentions with near-zero friction, (b) maintains an evolving semantic memory of those intentions, and (c) triggers recall based on real workflow context. It overlaps with (but isn't reducible to) "notes," "tasks," or "AI assistant."

**Contextual Productivity OS**: A meta-layer that spans apps and workflows—focused on "intent recall and follow-through" rather than launching and searching.

---

## Why This Category Can Emerge Now

1. **Mainstream AI productivity** is normalizing "ask the system what matters now."
2. **Consumer assistants** are evolving toward scheduled/agentic actions, but remain largely time-driven rather than context-driven across heterogeneous workflows.
3. **Context features are unstable** in some ecosystems—e.g., migrations that reduced location-based reminder functionality—underscoring that "contextual reminder capability" is not reliably protected by incumbent roadmaps.

---

## Venture-Scale Thesis

EasyJot can wedge into power-user and high-context-switch segments with:

- **Keyboard-first capture** experience
- **Personal intent graph** that compounds value over time
- **Workflow context engine** that improves with use

Defensibility comes from: (a) permissioned, high-signal context events, (b) user-labeled outcomes and feedback loops, (c) durable integrations, and (d) trust and privacy architecture aligned with platform rules.

**Credible path to $10M+ ARR** via a hybrid "prosumer → team → enterprise" revenue ladder.
