# Phase 04 — Retrieval

## Goal

Local FTS candidate retrieval and normalization in `screenpipe-recall` + `screenpipe-db`.

## Read first

- `docs/proactive-recall/reference/POLICY.md` (retrieval passes)
- `CLAUDE_PROGRESS.md` schema notes

## Tasks

1. **`screenpipe-db`:** Implement `recall_query_candidates` with parameterized SQL:
   - Join `frames_fts` + `frames`
   - `MATCH ?`, time bounds, optional `app_name`, url/path/title filters
   - `snippet(...)`, `bm25(...)`, `LIMIT`
   - **Never** interpolate raw user strings into SQL
2. **`screenpipe-recall/src/retrieval.rs`:**
   - Orchestrate 3 passes: same app (30d), domain/doc (90d), manual sparse fallback
   - Exclude last **15 minutes**
   - Build `q_primary`, `q_relaxed`, `q_manual` query strings from tokenizer
   - Dedupe by `frame_id`, then `content_hash`
3. **`RecallCandidate` struct:** frame id, timestamps, app, titles, url, path, snippet, normalized bm25, overlap feature slots, confidence placeholder, reason list, defer_group_key
4. Normalize BM25 across result set (lower-is-better → 0..1 higher-is-better confidence input)
5. Wire `recall_load_context` in db if needed for latest ui_event/frame lookup

## Exit criteria

- [ ] Integration or unit test with **in-memory / temp SQLite** returns candidates for seeded frames
- [ ] Empty context terms → empty list, no panic
- [ ] Phase 04 checked in progress file

## Verification

```bash
cargo test -p screenpipe-recall -- retrieval
cargo test -p screenpipe-db -- recall
cargo fmt
```

## Do not

- Final confidence scoring / Surface decision yet (phase 05)
