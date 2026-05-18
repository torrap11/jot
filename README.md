# Proactive Recall

**Proactive recall = right memory × right moment × fast enough × often silent × user still in control.**

Remembering, for a system, is **resurfacing** the right past context for **what you are doing now**—not storing more data.

```
right memory = g(what's happening now, what was captured before, how sure we are, whether interrupting is allowed)
```

The five factors above are how that function has to **feel** in product: correct retrieval, correct timing, sub-second hot path, default silence, explicit user agency.

## What it is

**Proactive recall** is an interaction model: surface relevant past context **before** you search. Reactive recall waits for you to ask; proactive recall infers **now**.

| | Reactive | Proactive |
|---|----------|-----------|
| Trigger | User asks | System infers "now" |
| Failure | Empty results | Wrong interrupt / noise |

## The five factors

| Factor | Meaning |
|--------|---------|
| **Right memory** | Correct episode or note; entities resolved ("Drima" ↔ "she") |
| **Right moment** | Context matches—app switch, meeting soon, conversation cue |
| **Fast enough** | Local index, narrow query, prefetch; no LLM on the hot path |
| **Often silent** | Low confidence → no card; cooldown; wrong interrupt is failure |
| **User in control** | Dismiss, snooze, blocklist, explain "why now", local-first |

## Docs

- [Interaction model](docs/interaction-model.md)
- [Architecture (Screenpipe integration)](docs/architecture.md)
- [Roadmap](docs/roadmap.md)

## Related

Integrates with [screenpipe](https://github.com/screenpipe/screenpipe) (episodic world model) + a recall policy layer.

## License

MIT
