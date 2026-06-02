# Phase 03 — Domain types & context

## Goal

Flesh out `screenpipe-recall` with types and deterministic context building (no policy/retrieval yet).

## Read first

- `docs/proactive-recall/reference/POLICY.md` (context rules only)
- `CLAUDE_PROGRESS.md` schema notes

## Tasks

Create or complete in `crates/screenpipe-recall/`:

| File | Contents |
|------|----------|
| `lib.rs` | exports |
| `decision.rs` | `RecallTrigger`, `RecallAction`, `RecallMode`, `RecallDecision` |
| `context.rs` | `RecallContext`, context builder |
| `config.rs` | thresholds from `reference/POLICY.md` as `RecallPreferences` |
| `tokenizer.rs` | deterministic tokenizer (lowercase, stopwords, max 8 terms, FTS-safe) |

### `RecallContext` fields

Match research spec: trigger, timestamps, frame/ui ids, app, window, url/domain, document path/name, visible excerpt, query_terms, previous app/title, mode, cold_start, app_opt_out, content_hash, simhash.

### Context build rules

1. On `AppSwitch`: conceptually 300 ms settle (caller may sleep; document in service phase).
2. Load latest app-switch `ui_event` + nearest frame ±2s (use real column names from phase 01).
3. Derive `browser_domain`, `document_name`, `query_terms`.
4. Set `Meeting` from heuristics (Zoom, Meet, Teams, Slack Huddle, FaceTime, Discord call — match fork normalization).
5. Set `Focus` from DB runtime settings when implemented.
6. Set `cold_start` per policy doc.
7. **No LLM.**

Expose: `build_recall_context(...)` returning `Result<RecallContext, _>` with timing hook for later instrumentation.

## Exit criteria

- [ ] Crate compiles and exports types
- [ ] Unit test: tokenizer drops short tokens and caps at 8
- [ ] Unit test: context builder with **fixture/mock** DB rows OR pure functions for domain/title extraction
- [ ] Phase 03 checked in progress file

## Verification

```bash
cargo test -p screenpipe-recall
cargo fmt
```

## Do not

- Implement `RecallPolicy::evaluate` yet
- Implement FTS queries yet
