# Interaction model

## Definition

**Proactive recall** = retrieve(episodic memory | intentional memory) given **context now**, then **surface | defer | silence** without a user query.

## Primitives

1. **Episodic world model** — what happened (screen, audio, apps, time)
2. **Context model** — what's happening now
3. **Retrieval** — fast candidate fetch
4. **Recall policy** — score, gates, silence by default
5. **Intervention** — how it appears (overlay, notification, agent)

## Contract

- Default **silence**
- **Bounded** frequency
- User **dismiss / snooze**
- **Explain** why now
- Degrade to reactive search when unsure or slow
