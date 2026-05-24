# PakrAI — architecture

**Scope:** [SCOPE.md](./SCOPE.md)

---

## System diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  PakrAI (Electron — jot/)                                        │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────────┐ │
│  │ Notes    │ │ ⌘P search│ │ Recordings  │ │ Pakr agent      │ │
│  │ ⌘N       │ │ library  │ │ search/ask  │ │ (notes reorg)   │ │
│  └────┬─────┘ └────┬─────┘ └──────┬──────┘ └────────┬────────┘ │
│       │            │              │                   │          │
│       ▼            ▼              │ HTTP :3030        ▼          │
│  ┌─────────┐  ┌─────────┐        │              notes SQLite    │
│  │ notes   │  │ notes   │        ▼                            │
│  │ SQLite  │  │ FTS     │  ┌─────────────────────────────┐   │
│  └────┬────┘  └─────────┘  │ integration/ + engineManager │   │
│       │                    └──────────────┬──────────────┘   │
│  ┌────┴──────────────────────────────────┐│                  │
│  │ resurfacePolicy + overlay (notes)      ││                  │
│  └───────────────────────────────────────┘│                  │
└───────────────────────────────────────────┼──────────────────┘
                                            ▼
                          ┌─────────────────────────────┐
                          │ screenpipe-engine           │
                          │ screen capture → OCR → FTS  │
                          │ (proactive-recall/)         │
                          └─────────────────────────────┘
```

---

## Repo ownership

| Path | Role |
|------|------|
| `jot/` | Product UI: notes, overlay, recordings query, Pakr |
| `integration/` | Engine lifecycle, `screenpipeClient`, recall client |
| `proactive-recall/` | Engine binary, capture DB, optional `screenpipe-recall` |
| `docs/pakrai/` | Spec |

---

## Data stores

| Store | Contents |
|-------|----------|
| Notes SQLite | Notes, folders, app_links, `resurface_at` |
| Capture SQLite (engine) | Screen frames, OCR text, FTS for **query** |

---

## Flows

### Query recordings ([QUERY-RECORDINGS.md](./QUERY-RECORDINGS.md))

```
User → Recordings panel → screenpipeClient.search / memories
  → render snippets + timestamps
  → (optional Ask) LLM summarizes with citations
```

### Context resurfacing (notes-first)

```
AppSwitch → workContext + note candidates → resurfacePolicy → overlay
```

May use engine for **optional** context signals later; v1 overlay = notes.

### Time resurfacing

```
NL time → resurface_at → scheduler → overlay
```

### Pakr agent

```
User → Pakr → tools on notes DB only
```

---

## IPC

| Channel | Purpose |
|---------|---------|
| `mvp:*` / `capture:*` | Notes |
| `screenpipe:*` | **Query recordings** (search, memories, engine state) |
| `recall:*` | Proactive recall (if using Rust policy) |
| `pakra:*` | Pakr agent |

---

## Locked decisions

1. **Capture in Rust engine** — not in Electron.  
2. **Query is user-initiated** — not on app-switch hot path.  
3. **No LLM on proactive overlay path.**  
4. **Screen Recording permission required** for query feature.  
5. **No microphone** in v1.  
6. Engine default **on** for PakrAI (`SCREENPIPE_ENABLED` true unless dev override).

---

## See also

- [QUERY-RECORDINGS.md](./QUERY-RECORDINGS.md)  
- `proactive-recall/docs/proactive-recall/reference/API.md`  
- `.claude/skills/screenpipe-api/SKILL.md`
