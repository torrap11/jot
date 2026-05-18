# Roadmap

Phases are ordered by the five factors: **right memory → right moment → fast enough → often silent → user in control**.

## Phase 1 — Right memory + fast enough

- Screenpipe `/search` with app + time filters
- Context snapshot on app switch
- Log `evaluate → surface | silence` (no UI yet)
- Benchmark retrieval latency on hot path

## Phase 2 — Right moment + often silent

- Triggers: app switch, return-after-interrupt, calendar (meeting soon)
- Confidence thresholds, cooldown, default silence
- Policy crate / module wired to retrieval scores

## Phase 3 — User in control

- Overlay / notification spec
- Dismiss, snooze, per-app blocklist
- "Why now" copy on every surface

## Phase 4 — Right moment (live)

- Streaming STT + conversation cues (strict opt-in)
- Entity linking (person ↔ pronoun)

## Phase 5 — Agent-native

- MCP: `evaluate_recall`, `explain_last_recall`
