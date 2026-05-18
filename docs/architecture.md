# Architecture

```text
capture → episodic store → retrieval(context) → policy → intervention
```

**Screenpipe** (upstream): capture + SQLite + `/search` on `localhost:3030`.

**Proactive recall** (this project): context signals, fast retrieval strategy, policy (`surface | defer | silence`), intervention specs.

```text
right memory = g(now, past, confidence, interrupt_allowed)
```

## Integration

- Read episodes via Screenpipe REST API or embedded `screenpipe-db`
- Triggers: app switch, calendar, optional live audio (opt-in)
- Do not duplicate capture/OCR/Whisper in v1
