# Phase 1 — Recall backend (Rust + `/recall/*`)

**PRD ref:** §11 Phase 1, §7.3 R1–R8  
**Goal:** `screenpipe-recall` implements real policy; API routes work; Jot can consume evaluate/SSE.

---

## Read first

- `engine/docs/engine/reference/ACCEPTANCE.md` (definition of done)
- `engine/docs/engine/prompts/00-START.md` (nested pipeline)

---

## Strategy

Execute the **existing Screenpipe recall pipeline** inside `engine/`:

| Nested | File |
|--------|------|
| 01 | `docs/engine/prompts/01-preflight-and-discovery.md` |
| 02 | `02-database-migrations.md` |
| 03 | `03-domain-types-and-context.md` |
| 04 | `04-retrieval.md` |
| 05 | `05-policy-and-scoring.md` |
| 06 | `06-recall-service-and-events.md` |
| 07 | `07-server-routes-and-sse.md` |

Update `engine/docs/engine/CLAUDE_PROGRESS.md` for nested work **and** workspace `docs/claude-code/CLAUDE_PROGRESS.md` for phase 1.

**Skip for this PRD build (defer to phase 4 or never):**

- `08-tauri-recall-card.md` — Jot overlay replaces Tauri card
- `09-controls-and-modes.md` — implement meeting/focus in Rust if quick; else stub with tests + Jot UI in phase 2/4
- `10-tests-docs-and-ship.md` — run equivalent verification below instead

---

## Additional PRD tasks (phase 1)

### Note candidates in retrieval

Extend retrieval so **Jot notes** can appear as recall candidates:

- Option A (preferred v1): HTTP adapter in `integration/` that loads linked notes by `app_key` / keywords and passes into evaluate as supplemental candidates (document contract in `integration/README.md`)
- Option B: DB bridge if notes are exported — only if A is blocked

Policy must score notes with same anchor classes (`same_app`, title overlap, etc.).

---

## Exit criteria

All items from `ACCEPTANCE.md` **except** “Tauri card appears on Surface”:

- [ ] `RecallContext` from live app switch
- [ ] Manual trigger works
- [ ] Retrieval local; no LLM on hot path
- [ ] Real `Surface | Defer | Silence`
- [ ] Cooldowns and caps enforced
- [ ] `recall_events` persistence for every decision
- [ ] `GET /recall/status`, `POST /recall/evaluate`, `POST /recall/action`, `GET /recall/stream`
- [ ] Low confidence → Silence by default
- [ ] Latency breakdown persisted
- [ ] ≥1 integration test on policy passes
- [ ] `cargo fmt` + `cargo test -p screenpipe-recall` pass
- [ ] Jot `recallClient.evaluate({ dryRun: false })` returns valid JSON when engine has capture data

---

## Verification

```bash
cd engine
cargo test -p screenpipe-recall
cargo test -p screenpipe-db   # if migrations touched
cargo fmt --all

export SCREENPIPE_LOCAL_API_KEY="<dev-key>"
./target/release/screenpipe &   # or already running

curl -s http://127.0.0.1:3030/recall/status -H "Authorization: Bearer $SCREENPIPE_LOCAL_API_KEY"
curl -s -X POST http://127.0.0.1:3030/recall/evaluate \
  -H "Authorization: Bearer $SCREENPIPE_LOCAL_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":true}'
```

Add curl examples to `engine/README.md` or workspace README under “Recall API”.

---

## Do not

- Rewrite `/search` or MCP
- Port policy to JavaScript as source of truth
- Build full Rewind UI in Jot (phase 3)

---

## On completion

Update both progress files → phase 1 ✅, proceed to `03-phase-2-jot-resurfacing.md`.
