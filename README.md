# Proactive Recall

**Remembering = resurfacing the right memory for what you're doing now.**

```
right memory = g(what's happening now, what was captured before, how sure we are, whether interrupting is allowed)
```

## What it is

**Proactive recall** is an interaction model: the system surfaces relevant past context **before** you search—based on present situation, episodic data, confidence, and permission to interrupt.

| | Reactive | Proactive |
|---|----------|-----------|
| Trigger | User asks | System infers "now" |
| Failure | Empty results | Wrong interrupt / noise |

## Requirements

1. **Fast retrieval** — local index, sub-second hot path; no LLM in the critical path
2. **Episodic data** — capture must exist and be searchable
3. **Accurate context** — app, conversation, entities (who is "she"?)
4. **Strict policy** — threshold, cooldown, default silence
5. **Respectful UI** — small overlay, dismiss/snooze, local-first, clear permissions

## Docs

- [Interaction model](docs/interaction-model.md)
- [Architecture (Screenpipe integration)](docs/architecture.md)
- [Roadmap](docs/roadmap.md)

## Related

Built to integrate with [screenpipe](https://github.com/screenpipe/screenpipe) (episodic world model) + a recall policy layer.

## License

MIT
