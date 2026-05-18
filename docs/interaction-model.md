# Interaction model

## Definition

**Proactive recall** = right memory × right moment × fast enough × often silent × user still in control.

Operationally: retrieve(episodic memory | intentional memory) given **context now**, then **surface | defer | silence**—without a user query.

## The five factors

### Right memory

- Episode exists in the store (captured text, audio, screen)
- Retrieval returns the relevant snippet, not a near miss
- Entities linked (person, place, project)

### Right moment

- Trigger matches situation: app switch, calendar, conversation cue, return-after-interrupt
- Surfacing before the moment passes (hesitation, wrong app, forgotten name)

### Fast enough

- Hot path: local FTS / SQLite, tight time + app filters
- Target: feel instant (~sub-second); defer or silence if lookup is slow
- LLM only after candidates exist (summarize), not to find them

### Often silent

- Default when confidence is below threshold
- Cooldown and per-context caps
- Wrong interrupt counts as failure, not "we tried"

### User still in control

- Dismiss, snooze, "never for this app"
- Explain why this surfaced
- Opt-in for sensitive signals (mic during calls)
- Degrade to reactive search anytime

## Primitives

1. **Episodic world model** — what happened
2. **Context model** — what's happening now
3. **Retrieval** — fast candidate fetch (**right memory**, **fast enough**)
4. **Recall policy** — score, gates (**right moment**, **often silent**)
5. **Intervention** — overlay, notification, agent (**user in control**)

## Reactive vs proactive

| | Reactive | Proactive |
|---|----------|-----------|
| Trigger | User | System ("now") |
| Success | Correct answer | Right memory × right moment × fast enough |
| Failure | Empty | Noise (violates **often silent**) |
