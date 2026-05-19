# Research and master Claude Code prompt for proactive recall on Screenpipe

> **Implementation:** Use the sequential Claude Code pipeline in [`docs/proactive-recall/`](proactive-recall/README.md) — paste [`prompts/00-START.md`](proactive-recall/prompts/00-START.md) in your Screenpipe fork. The monolithic master prompt below is superseded by that folder.

## Research report

This first section is the research report. I could validate the public Screenpipe main branch’s current event-driven capture spec, database layer, and Tauri app layout, but not the fork-specific `docs/proactive-recall/*` files and `crates/screenpipe-recall` stubs you referenced in your request. The master prompt therefore starts by reading those fork-local files first and then applies the implementation-ready spec below. The public repo does show the relevant baseline: local-first capture, SQLite/FTS storage, a localhost API, a Tauri app in `apps/screenpipe-app-tauri`, a `screenpipe-db` crate with migrations and query code, and a `screenpipe-events` crate with its own source tree. citeturn1view0turn12view0turn15view0turn31view0turn32view0

### Executive summary

- **Use `AppSwitch` as the default v1 decision point.** Screenpipe’s own event-driven capture spec calls app switch the “highest-value event” and recommends a 300 ms settle window, which is an unusually strong fit for proactive recall because it detects real context changes without introducing polling or new sensors. citeturn61view0

- **Build `RecallContext` from deterministic local signals, not an LLM.** The best hot-path context bundle is: current app, window title, browser URL or domain, document path or basename, nearest synchronized frame, visible accessibility/OCR text excerpt, and the immediately previous app/window transition. Screenpipe already records these raw ingredients in `frames`, `frames_fts`, accessibility inserts, and `ui_events`. citeturn41view2turn50view0turn61view0

- **Retrieve candidates with local FTS plus app/domain/document filters.** Screenpipe already uses synchronized frame-plus-text capture and `frames_fts`, so the fastest useful v1 is direct SQLite/FTS retrieval over the same app, same domain, or same document window, excluding the last few minutes and avoiding any hot-path model call. citeturn1view0turn50view0turn61view0

- **Treat `Silence` as the default and `Surface` as an earned outcome.** Recent abstention work in selective generation and RAG consistently shows that systems are safer when they abstain under weak or noisy evidence, and SURE-RAG explicitly argues that retrieval topicality is not the same thing as evidential support. That maps directly to proactive recall: low-support candidates should be silent, not “helpful.” citeturn23academia3turn22academia0turn22academia2

- **Use an explicit tri-state policy: `Surface | Defer | Silence`.** `Surface` should require strong evidence plus no cooldown, no cap violation, no meeting/focus suppression, and at least two anchor classes. `Defer` should keep medium-confidence candidates alive for a later app switch or manual trigger. `Silence` should log the decision and do nothing visible. That design matches non-intrusive assistance research, which frames the problem as deciding both *when* and *whether* to act without disrupting the human’s primary task. citeturn17academia2turn34academia0turn46academia1

- **The UI should be a single calm, non-modal card with explanation and controls.** Recent notification-design work shows that urgency-sensitive, less intrusive presentation reduces workload and frustration, while JITI studies emphasize that users need agency to adapt interventions to their own working styles. For v1, that means one small Tauri card, no sound, one visible card at a time, and controls for dismiss, snooze, and never-this-app. citeturn34academia3turn46academia2turn46academia3

- **Meeting mode should suppress auto-surface, and focus mode should be suppressive by default.** Microsoft Recall’s rollout shows that even opt-in, filtered memory systems face intense privacy and interruption scrutiny; Granola’s recent privacy controversy shows how quickly trust erodes when memory tools feel too eager or too shareable. For Screenpipe, the safe v1 rule is simple: during meetings or explicit focus suppression, auto recall goes quiet and only manual trigger bypasses it. citeturn29news2turn44news5turn44news0

- **The cleanest Screenpipe integration is `events → recall service → DB/event log → SSE → Tauri card`.** This respects the repo’s current separation of event capture, DB ownership, localhost API, and desktop UI. It also fits the repo’s root Cargo workspace, which excludes `apps/screenpipe-app-tauri/src-tauri`, meaning backend Rust work and app-Rust work must be built and tested separately. citeturn12view0turn15view0turn31view0turn32view0turn37view0turn50view0

### Recommended architecture

Screenpipe’s public architecture already gives you the right substrate for proactive recall: event-driven capture, synchronized frame/text storage, local SQLite with FTS, a localhost API, and a Tauri desktop shell. The repo also already treats event capture and UI as separate concerns, and its DB manager uses explicit read/write pools plus a serialized write queue. That means the fastest and least disruptive proactive-recall architecture is not a new sidecar service and not a polling-heavy loop; it is a small domain crate hosted by the server, fed by app-switch events, querying `screenpipe-db` directly, persisting every decision, and streaming only surfaced decisions to the Tauri UI. citeturn1view0turn50view0turn61view0

```mermaid
flowchart LR
    A[screenpipe-events AppSwitch or Manual trigger] --> B[screenpipe-recall service]
    B --> C[Build RecallContext]
    C --> D[Retrieve via screenpipe-db FTS]
    D --> E[Policy evaluate Surface Defer Silence]
    E --> F[(SQLite recall_events + prefs)]
    E --> G[/recall/status and /recall/evaluate]
    E --> H[/recall/stream SSE]
    H --> I[screenpipe-app-tauri recall card]
    I --> J[Dismiss Snooze Never this app]
    J --> G
```

The main architectural choice is where the hot path lives. It should live inside `screenpipe-server` with direct `screenpipe-db` access, not through an internal HTTP self-call, because the repo already centralizes DB access there and keeps writes serialized. SSE is the right server-to-UI transport because the app only needs one-way server events for surfaced recalls and status changes; webhooks add localhost callback complexity, and polling should be retained only as a fallback or debug path. That split also keeps `/search` and MCP intact, exactly as you requested. citeturn1view0turn50view0

| Layer | What should live here | Why this is the right place | Target hot-path budget |
|---|---|---|---|
| `screenpipe-events` | Emit or expose `AppSwitch` triggers and manual trigger hook-in | It already owns event flow and app-switch semantics | negligible |
| `screenpipe-recall` | Context normalization, retrieval orchestration, candidate reranking, policy, defer logic | Keeps decision logic testable and isolated from UI/server details | 20–50 ms policy, plus retrieval orchestration |
| `screenpipe-db` | Migration for `recall_events` and preferences; direct FTS/query helpers | It already owns migrations, query code, and the write queue | 80–220 ms retrieval on warm DB |
| `screenpipe-server` | Service lifecycle, event subscription, REST routes, SSE, persistence glue | It already owns localhost API behavior | 20–60 ms orchestration/persistence |
| `screenpipe-app-tauri` | Hidden recall-card window, SSE subscription, actions, settings/manual trigger | It already owns desktop UX and app Rust/TS split | outside server hot path |

A note that matters for the implementation prompt: the public workspace uses `crates/*` in root Cargo, but excludes `apps/screenpipe-app-tauri/src-tauri`, and the app directory contains both a frontend web app and `src-tauri` Rust code. Claude Code therefore needs to run Rust checks in both places and not assume that one root `cargo test` covers everything. citeturn12view0turn15view0

### Research deep dives

#### Context inference

The strongest v1 context signals are the ones Screenpipe already captures cheaply and synchronously: the current app, the current window or tab title, the browser URL or domain, the document path when the platform exposes it, the visible accessibility/OCR text excerpt, and the immediately preceding app switch. Screenpipe’s DB code already stores `browser_url`, `window_title`, `app_name`, `text_content` in synced UI events, and its event-driven frame schema includes `document_path`, `content_hash`, `simhash`, and a consolidated `frames_fts`/`full_text` path. In other words, `RecallContext` can be built mostly by normalization and nearest-row lookup rather than by inventing new capture infrastructure. citeturn41view2turn50view0turn61view0

The best v1 `RecallContext` schema is therefore a “context envelope,” not a learned latent state. It should include stable anchors first, because stable anchors are both fast and privacy-legible: `active_app`, `active_window_title`, `browser_url`, `browser_domain`, `document_path`, `document_name`, `visible_text_excerpt`, `query_terms`, `previous_app`, `trigger`, `timestamp`, `mode`, `cold_start`, and the raw `frame_id` / `ui_event_id` that produced the context. That is enough to answer “what am I doing now?” and “what should count as the same thing as before?” while keeping the hot path comfortably sub-second. The public event-driven spec also aligns with this: it explicitly favors accessibility-first extraction, states that synchronized text and screenshot timestamps eliminate desync, and treats app switch as the highest-value context change. citeturn61view0

Privacy boundaries should be conservative because this product category is trust-fragile. Screenpipe is already local-first and already supports deterministic app/window/time/content gating for pipes. Meanwhile, Microsoft Recall’s original backlash and repeated security/privacy scrutiny show that even opt-in, local snapshot systems become controversial when users feel watched too broadly, and Granola’s 2026 privacy controversy shows how quickly “memory” tools become suspect when sharing or retention boundaries are fuzzy. For proactive recall, that argues for five boundaries in v1: no cloud path, no LLM in the hot path, same-device processing only, explicit “never this app,” and suppression when the current or candidate context is sensitive or denied by the same gating vocabulary Screenpipe already uses elsewhere. citeturn1view0turn29news2turn44news5turn44news0

Cold start should be abstention-first. A new install, a sparse history, or a weak context bundle should result in `Silence`, not a speculative memory card. Recent selective-generation and RAG work is useful here even though proactive recall is not itself a generative QA feature: the central lesson is that systems are safer and often more trustworthy when they decline to act under insufficient evidence. SURE-RAG’s core point is especially portable: retrieving something topically related is not the same as having evidence strong enough to justify intervention. In practice, that means auto-surface should require repeated historical anchors, enough same-app or same-document history, and a sufficiently strong score; until then, the system stays quiet and logs what it *would* have done. citeturn23academia3turn22academia0turn22academia2

#### Recall policy

A good v1 recall policy should look more like calibrated abstention than like recommendation ranking. The fastest way to ship something trustworthy is to score candidates with cheap retrieval and overlap features, then require multiple independent reasons before showing anything. That design is directly supported by recent RAG-abstention literature: noisy retrieved context often inflates false certainty, and retrieval relevance alone is not the same as verified support. Translated into Screenpipe terms, a candidate that only matches one vague text token should not surface; a candidate that matches the same app, same document or domain, and overlapping title/text has a much stronger claim to interrupt. citeturn22academia0turn22academia2turn23academia3

The scoring stack should therefore be deterministic and layered. First, retrieve a small candidate set with SQLite FTS and time/app/doc filters. Then rerank with overlap features such as same app, exact document basename, same browser host or host-plus-first-path-segment, title-token overlap, visible-text overlap, recency band, and novelty. Finally, gate with cooldowns, per-app caps, and suppression states. A practical v1 rule is to require at least two anchor classes for automatic `Surface`, one anchor class plus a medium score for `Defer`, and default `Silence` otherwise. That sacrifices some recall rate, but it aligns with both abstention research and the non-intrusive-assistance literature, which treats the human’s current plan as the primary process. citeturn17academia2turn34academia0turn22academia0

`Defer` is worth keeping distinct from `Silence`. In recent uncertainty-aware JITI work, the system’s scheduling logic changes when timing is uncertain; it preserves later opportunities instead of spending all of its confidence at the first possible moment. For proactive recall, `Defer` should mean: “this candidate may be worth surfacing, but not right now.” Concretely, that means storing one deferred group per app or context key, waiting for the next eligible app switch or manual trigger, and only surfacing later if the same context repeats or the evidence gets stronger. `Silence` means no visible intervention and no pending batch. citeturn46academia1turn46academia3turn17academia2

Cooldowns and caps are not just anti-spam scaffolding; they are core product behavior. A good default set for v1 is: one global auto-surface every 2 minutes, one auto-surface per app per hour, two auto-surfaces per app per day, and an exact-candidate cooldown of roughly 8 hours. User actions should deepen suppression: `Dismiss` should suppress that exact candidate for several hours, `Snooze` should set an explicit future time, and `Never this app` should hard-disable auto-surface for that app while still allowing explicit manual trigger. Those values are strict on purpose because the category evidence points the same way: notification overload undermines trust, and calm, user-steerable interventions are more likely to be adopted. citeturn34academia3turn46academia2turn46academia3

#### Intervention UI

The right v1 intervention pattern is a small, non-modal, single-card overlay anchored to a desktop edge, with no sound, no stack, and no pressure to act. That recommendation is supported by two research threads. First, adaptive-notification work shows that less intrusive presentation for non-urgent content reduces workload and frustration while preserving awareness. Second, JITI and calm-reminder work shows that users are not passive recipients; they actively shape interventions to fit their own routines, which means the interface should expose obvious, low-friction control rather than trying to be clever in secret. citeturn34academia3turn46academia2turn46academia3

For Screenpipe, that translates into a Tauri card with four pieces of information: a terse label, a snippet, a deterministic “why now” explanation, and controls. The explanation should not be a generated paragraph. It should be template-based and auditable: “same app,” “same document name,” “same site/domain,” “last seen 2h ago,” and similar chips or short strings. This matches the strongest consumer patterns in the category. Granola’s note UX is effective partly because notes retain visible grounding back to transcript quotes; Microsoft Recall’s selling point is searchable snapshots and timeline evidence; and Limitless’s lasting pattern is searchable summaries tied to captured episodes. Screenpipe’s equivalent should be to show a grounded snippet plus explicit reasons, not a mysterious assistant voice. citeturn44news0turn29news2turn30news0

Meeting and focus modes should be suppressive by default. Meeting mode should be auto-inferred from obvious conferencing app names, browser domains, or window-title tokens and should force `Silence` for auto triggers. Focus mode should be user-controlled in v1, ideally via a toggle in the app and a short “suppress proactive recall” action. Manual trigger must still work in both modes, because the whole product premise includes user control. That balance is important: Microsoft Recall’s repeated privacy posture now emphasizes opt-in, deletion, and exclusion controls, while Granola’s privacy backlash shows that memory tools lose trust when they feel visible on the vendor’s terms instead of the user’s. citeturn29news2turn44news5turn44news0

#### Screenpipe integration

The public Screenpipe repo already points to the clean integration boundary. `screenpipe-db` owns migrations and DB logic; `screenpipe-events` owns event capture; the root Cargo workspace includes `crates/*` but excludes the Tauri app’s `src-tauri`; and the app itself is clearly split into frontend web code and separate Tauri Rust code. That means `screenpipe-recall` should be a pure domain crate in `crates/`, `screenpipe-server` should host the long-lived recall service and HTTP routes, and `screenpipe-app-tauri` should own presentation and user actions. citeturn12view0turn15view0turn31view0turn32view0turn37view0

Persistence belongs in the shared Screenpipe SQLite database, not in app-local JSON or a second store. The DB manager already sets up separate read and write pools, creates a serialized write queue, runs migrations from `crates/screenpipe-db/src/migrations`, and already contains self-healing logic for event-driven columns and `frames_fts` behavior. A recall implementation that adds `recall_events` and preferences to the same migration and write path will be much easier to debug, much easier to dogfood with `curl`, and much less likely to regress under concurrency. citeturn37view0turn50view0

For transport, prefer internal event subscription from `screenpipe-events` into the recall service, and SSE from the server into the Tauri app. Polling is acceptable only as a fallback if the fork’s event exposure is incomplete. Webhooks are the wrong abstraction here because everything is on the same device and the flow is unidirectional. The public capture spec is also philosophically aligned with this choice: it explicitly favors event-driven behavior over clock-driven polling and treats app-switch semantics as central. citeturn61view0turn1view0

#### MVP scope

A realistic Phase 1 for a one-to-two-engineer team is narrow and shippable: app-switch plus manual trigger, deterministic context inference, direct SQLite/FTS retrieval, tri-state policy, recall event persistence, `/recall/status`, `/recall/evaluate`, one lightweight Tauri card, and at least one integration test. That is feasible precisely because Screenpipe already provides the expensive substrate: event-driven capture, synchronized frame/text storage, local SQLite/FTS, and the desktop app shell. citeturn1view0turn50view0turn61view0

A sensible Phase 2 is still small: defer batching, meeting suppression, a focus-mode toggle, better debug/status views, app-level preferences, and performance instrumentation that records where the hot-path time goes. Those are meaningful product gains without forcing embeddings, semantic rerankers, calendar integration, or new capture triggers. Research on calm prompting and non-intrusive assistance strongly suggests that timing, restraint, and user control add more trust than adding more “intelligence” too early. citeturn17academia2turn34academia3turn46academia3

The explicit non-goals for v1 should be just as clear: no cloud dependency, no LLM on the hot path, no rewrite of `/search`, no MCP changes, no cross-device sync logic, no attempt at cross-platform UX parity before macOS works well, no stack of toasts, no auto-surfacing during meetings, and no trigger sprawl beyond `AppSwitch` and `Manual`. That scope is not timid; it is what gives proactive recall a chance to feel invisible until it helps. citeturn1view0turn29news2turn44news0

### v1 technical spec

The implementation-ready spec below is deliberately anchored in public Screenpipe fields and patterns that already exist: synchronized event-driven frames, `document_path`, `browser_url`, `ui_events`, `frames_fts` full text, and a DB write queue. The new work is mainly orchestration, scoring, persistence, and UI wiring. citeturn41view2turn50view0turn61view0

**Recommended `RecallContext` schema**

| Field | Type | Source | Notes |
|---|---|---|---|
| `trigger` | enum | event/manual | `AppSwitch` or `Manual` only in v1 |
| `occurred_at` | RFC3339 string | event time | UTC |
| `settled_at` | RFC3339 string | service clock | after 300 ms settle for app switch |
| `active_frame_id` | `Option<i64>` | nearest frame | prefer app-switch capture, else nearest frame within 2 s |
| `active_ui_event_id` | `Option<i64>` | latest app-switch ui_event | tie-breaking and debug |
| `active_app` | `String` | frame/ui_event | normalized app name |
| `active_window_title` | `Option<String>` | frame/ui_event | normalized title |
| `browser_url` | `Option<String>` | frame/ui_event | full URL if present |
| `browser_domain` | `Option<String>` | derived | host only |
| `document_path` | `Option<String>` | frame | exact path if available |
| `document_name` | `Option<String>` | derived | basename only |
| `visible_text_excerpt` | `String` | `frames_fts` / accessibility | truncate to ~300 chars |
| `query_terms` | `Vec<String>` | tokenizer | deterministic terms from title/doc/domain/text |
| `previous_app` | `Option<String>` | prior app-switch event | helps transition logic and explainability |
| `previous_window_title` | `Option<String>` | prior app-switch event | optional |
| `mode` | enum | heuristics + prefs | `Normal`, `Meeting`, `Focus` |
| `cold_start` | `bool` | history lookup | true if history too sparse for auto surface |
| `app_opt_out` | `bool` | prefs + gates | true if “never this app” or deny rules |
| `content_hash` | `Option<i64>` | frame | for duplicate suppression |
| `simhash` | `Option<i64>` | frame | for near-duplicate suppression |

**Context build algorithm**

1. On `AppSwitch`, wait 300 ms.
2. Fetch the latest matching app-switch `ui_event`.
3. Fetch the nearest frame within ±2 seconds, preferring a frame whose trigger indicates app switch if that column exists on the fork.
4. Build normalized anchors from app title, URL/domain, document basename, and visible text.
5. Set `mode=Meeting` if app, domain, or title matches known meeting heuristics.
6. Set `mode=Focus` if user enabled focus suppression.
7. Mark `cold_start=true` if there are fewer than 5 historical candidates for the same app or zero strong anchors for the same domain/document.
8. If any deny gate matches, mark the context as suppressed before retrieval.

**Deterministic tokenization**

- lowercase
- split on non-alphanumeric except `.`, `/`, `_`, `-`
- drop tokens shorter than 3 chars
- strip a small English stopword list
- keep document basename, domain host, and exact title phrase as special anchors
- max 8 query terms
- never interpolate unsanitized raw strings into SQL

**Retrieval plan**

- Exclude the most recent 15 minutes from candidate retrieval.
- Run up to three cheap local queries:
  - same app within 30 days
  - same domain or same document basename within 90 days
  - manual-trigger fallback across all apps within 30 days, only if the first two are sparse
- Limit each query to a small result set and dedupe by `frame_id`, then by `content_hash`, then by normalized snippet equality if needed.
- Prefer frame-based episodes for v1. Do not add LLM summarization or embedding reranking in the hot path.

**Retrieval SQL skeleton**

```sql
-- Adapt column names to the fork’s actual schema after inspecting screenpipe-db.
-- Use the existing consolidated frames_fts/full_text path if present.

SELECT
    f.id AS frame_id,
    f.timestamp,
    f.app_name,
    f.window_name,
    f.browser_url,
    f.document_path,
    snippet(frames_fts, 0, '[', ']', '…', 18) AS snippet,
    bm25(frames_fts) AS bm25_score,
    f.content_hash,
    f.simhash
FROM frames_fts
JOIN frames f ON frames_fts.rowid = f.id
WHERE frames_fts MATCH ?1
  AND f.timestamp >= ?2
  AND f.timestamp < ?3
  AND (?4 IS NULL OR f.app_name = ?4)
  AND (
        ?5 IS NULL
        OR f.browser_url LIKE '%' || ?5 || '%'
        OR f.document_path LIKE '%' || ?6 || '%'
        OR f.window_name LIKE '%' || ?7 || '%'
      )
ORDER BY bm25(frames_fts), f.timestamp DESC
LIMIT ?8;
```

**Recommended query-construction strategy**

- `q_primary`: quoted document basename or domain host, plus 2–4 high-signal title/text tokens
- `q_relaxed`: only the strongest 2–3 tokens if the primary query returns nothing
- `q_manual`: broader all-app query for manual trigger only

**Candidate scoring**

Normalize FTS score across the retrieved set because SQLite FTS5 scores are rank-relative and lower-is-better. Then compute a deterministic confidence like this:

```text
confidence =
  0.40 * normalized_fts
+ 0.18 * exact_document_match
+ 0.12 * same_domain_or_host_prefix
+ 0.10 * same_app
+ 0.10 * title_overlap
+ 0.08 * visible_text_overlap
+ 0.05 * recency_band
+ 0.05 * novelty_bonus
- 0.10 * duplicate_penalty
- 0.15 * prior_dismiss_penalty
```

Where:

- `exact_document_match` = 1.0 if basename matches exactly, else 0.0
- `same_domain_or_host_prefix` = 1.0 if host matches or same host + first path segment, else 0.0
- `title_overlap` = Jaccard overlap of normalized title tokens
- `visible_text_overlap` = Jaccard overlap of current visible-text terms and candidate snippet/full-text terms
- `recency_band` = 1.0 for 2h–3d old, 0.6 for 3d–30d, 0.3 for 30m–2h, 0.1 above 30d
- `novelty_bonus` = 1.0 only if same context key has not already been surfaced in the last 24h
- `duplicate_penalty` = 1.0 for equal `content_hash` or high-similarity snippet, else 0.0
- `prior_dismiss_penalty` = 1.0 if the same frame/context was dismissed recently

**Anchor classes**

Treat the following as independent anchor classes:

- same app
- exact document basename match
- same browser host or host-prefix
- title overlap above 0.30
- visible-text overlap above 0.15

Auto-surface should require at least two anchor classes. Manual trigger can surface with one.

**Policy thresholds and defaults**

- `AUTO_SURFACE_THRESHOLD = 0.78`
- `AUTO_DEFER_THRESHOLD = 0.62`
- `MANUAL_SURFACE_THRESHOLD = 0.55`
- `MANUAL_DEFER_THRESHOLD = 0.45`
- `EXACT_CANDIDATE_COOLDOWN_HOURS = 8`
- `APP_SURFACE_COOLDOWN_MINUTES = 20`
- `GLOBAL_SURFACE_COOLDOWN_MINUTES = 2`
- `MAX_APP_SURFACES_PER_HOUR = 1`
- `MAX_APP_SURFACES_PER_DAY = 2`
- `MAX_GLOBAL_SURFACES_PER_DAY = 6`
- `DEFAULT_SNOOZE_MINUTES = 30`
- `DEFER_RECHECK_MINUTES = 10`
- `DEFER_EXPIRY_HOURS = 24`

**Policy pseudocode**

```rust
fn evaluate(
    ctx: &RecallContext,
    candidates: &[RecallCandidate],
    history: &RecallHistory,
    prefs: &RecallPreferences,
    now: DateTime<Utc>,
) -> RecallDecision {
    if !prefs.enabled {
        return silence("disabled");
    }

    if ctx.trigger == RecallTrigger::AppSwitch {
        if ctx.app_opt_out {
            return silence("app_opt_out");
        }
        if gate_denies(ctx, prefs) {
            return silence("gated");
        }
        if ctx.mode == ContextMode::Meeting {
            return silence("meeting_mode");
        }
        if ctx.mode == ContextMode::Focus {
            return silence("focus_mode");
        }
        if ctx.cold_start {
            return silence("cold_start");
        }
        if history.global_surface_cooldown_active(now) {
            return silence("global_cooldown");
        }
        if history.app_surface_cooldown_active(&ctx.active_app, now) {
            return silence("app_cooldown");
        }
        if history.app_surfaces_last_hour(&ctx.active_app) >= prefs.max_app_surfaces_per_hour {
            return silence("app_hourly_cap");
        }
        if history.app_surfaces_today(&ctx.active_app) >= prefs.max_app_surfaces_per_day {
            return silence("app_daily_cap");
        }
        if history.global_surfaces_today() >= prefs.max_global_surfaces_per_day {
            return silence("global_daily_cap");
        }
    }

    let top = match rerank_best_candidate(ctx, candidates, history, now) {
        None => return silence("no_candidates"),
        Some(c) => c,
    };

    if history.exact_candidate_cooldown_active(top.frame_id, now) && ctx.trigger != RecallTrigger::Manual {
        return silence("exact_candidate_cooldown");
    }

    let anchor_classes = count_anchor_classes(ctx, &top);
    let surface_threshold = if ctx.trigger == RecallTrigger::Manual {
        prefs.manual_surface_threshold
    } else {
        prefs.auto_surface_threshold
    };
    let defer_threshold = if ctx.trigger == RecallTrigger::Manual {
        prefs.manual_defer_threshold
    } else {
        prefs.auto_defer_threshold
    };

    if top.confidence >= surface_threshold
        && (ctx.trigger == RecallTrigger::Manual || anchor_classes >= 2)
    {
        return surface(top, build_why_now(ctx, &top), now);
    }

    if top.confidence >= defer_threshold
        && !history.defer_group_is_saturated(top.defer_group_key.as_deref(), now)
    {
        return defer(top, now + chrono::Duration::minutes(prefs.defer_recheck_minutes as i64));
    }

    silence("low_confidence")
}
```

**Persistence schema**

```sql
CREATE TABLE IF NOT EXISTS recall_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    trigger TEXT NOT NULL,                  -- app_switch | manual
    action TEXT NOT NULL,                   -- surface | defer | silence
    confidence REAL NOT NULL,
    app_name TEXT,
    window_title TEXT,
    browser_url TEXT,
    browser_domain TEXT,
    document_path TEXT,
    document_name TEXT,
    context_key TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'normal',    -- normal | meeting | focus
    reason_primary TEXT NOT NULL,
    reason_json TEXT NOT NULL DEFAULT '{}',
    query_text TEXT,
    query_terms_json TEXT NOT NULL DEFAULT '[]',
    candidate_count INTEGER NOT NULL DEFAULT 0,
    top_candidate_frame_id INTEGER,
    top_candidate_timestamp TEXT,
    top_candidate_app_name TEXT,
    top_candidate_window_title TEXT,
    top_candidate_browser_url TEXT,
    top_candidate_document_path TEXT,
    top_candidate_snippet TEXT,
    top_candidate_score REAL,
    cooldown_until TEXT,
    deferred_until TEXT,
    deferred_group_key TEXT,
    user_feedback TEXT,                     -- none | dismiss | snooze | never_app | opened
    snoozed_until TEXT,
    latency_context_ms INTEGER NOT NULL DEFAULT 0,
    latency_retrieval_ms INTEGER NOT NULL DEFAULT 0,
    latency_policy_ms INTEGER NOT NULL DEFAULT 0,
    latency_persist_ms INTEGER NOT NULL DEFAULT 0,
    latency_total_ms INTEGER NOT NULL DEFAULT 0,
    debug_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(top_candidate_frame_id) REFERENCES frames(id)
);

CREATE INDEX IF NOT EXISTS idx_recall_events_created_at
    ON recall_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recall_events_action_created_at
    ON recall_events(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recall_events_context_key_created_at
    ON recall_events(context_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recall_events_app_created_at
    ON recall_events(app_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recall_events_candidate_created_at
    ON recall_events(top_candidate_frame_id, created_at DESC);

CREATE TABLE IF NOT EXISTS recall_app_preferences (
    app_name TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    never_surface INTEGER NOT NULL DEFAULT 0,
    snooze_until TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS recall_runtime_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
```

**Recommended API contract**

`GET /recall/status`

```json
{
  "enabled": true,
  "focus_mode": false,
  "meeting_mode": false,
  "pending_deferred": 1,
  "last_context": {
    "trigger": "app_switch",
    "active_app": "Cursor",
    "active_window_title": "policy.rs — screenpipe-recall",
    "browser_domain": null,
    "document_name": "policy.rs",
    "cold_start": false
  },
  "last_decision": {
    "action": "surface",
    "confidence": 0.84,
    "reason_primary": "same_document",
    "top_candidate_frame_id": 183221,
    "top_candidate_snippet": "cooldown + per-app caps ..."
  },
  "latency_ms": {
    "context": 34,
    "retrieval": 141,
    "policy": 17,
    "persist": 6,
    "total": 198
  }
}
```

`POST /recall/evaluate`

Request:

```json
{
  "trigger": "manual",
  "dry_run": false,
  "override": null
}
```

Response:

```json
{
  "event_id": 912,
  "decision": {
    "action": "surface",
    "confidence": 0.81,
    "reason_primary": "same_document",
    "why_now": [
      "same app",
      "same document name",
      "last seen 2h ago"
    ],
    "candidate": {
      "frame_id": 183221,
      "timestamp": "2026-05-18T14:12:08.221Z",
      "snippet": "cooldown + per-app caps ..."
    }
  }
}
```

`POST /recall/action`

Request:

```json
{
  "event_id": 912,
  "action": "snooze",
  "snooze_minutes": 30
}
```

`GET /recall/stream`

- SSE events:
  - `recall.surface`
  - `recall.status`
  - `recall.action_applied`

**Recommended UI wireframe**

```text
┌ Proactive recall ─────────────────────────────── ✕
│ From earlier in Cursor
│ “cooldown + per-app caps” in policy.rs
│
│ Why now: same app • same document • last seen 2h ago
│
│ [Dismiss]   [Snooze ▾]   [Never this app]
└──────────────────────────────────────────────────
```

**UI behavior**

- small always-on-top Tauri utility window
- macOS-first placement: top-right of primary display
- width ~380 px, max height ~220 px
- one card visible at a time
- no sound, no bounce, no modal focus-steal
- auto-hide after 12 seconds unless hovered
- `Esc` dismisses
- if a second surfaced item arrives while a card is visible, keep only the higher-confidence one or queue a single pending item count
- card body can optionally deep-link into existing timeline/search UI, but that is secondary to the required controls

**Meeting and focus modes**

- `Meeting`: auto-inferred from active app/domain/title heuristics; all auto triggers become `Silence`
- `Focus`: user toggle stored in runtime settings; all auto triggers become `Silence`
- `Manual` trigger bypasses meeting/focus suppression, cooldowns, and per-app caps, but still logs the decision

**Performance budget**

| Stage | Target |
|---|---|
| Context build | 20–60 ms |
| Retrieval | 80–220 ms |
| Policy + scoring | 10–40 ms |
| Persistence + broadcast | 5–20 ms |
| Total server hot path | under 500 ms on warm DB |

The `latency_*_ms` fields in `recall_events` should be treated as a required observability feature, not just debug garnish.

## MASTER_CLAUDE_CODE_PROMPT.md

The prompt below assumes the fork contains the proactive-recall docs and stub paths you listed, and it also assumes the public repo layout where the Tauri Rust app lives under `apps/screenpipe-app-tauri/src-tauri` outside the root Cargo workspace. That separation is visible in the public `Cargo.toml` and app directory layout, which is why the prompt explicitly tells Claude Code to run checks in both places. citeturn12view0turn15view0

```markdown
# Build fully working proactive recall on Screenpipe

## Role

You are implementing proactive recall end-to-end in this Screenpipe fork.

Ship working code, not stubs.
Run tests.
Fix compile errors.
Do not stop at TODOs.
Do not replace existing capture/storage/search/MCP infrastructure.
Layer on top of the existing system.

You may need multiple Claude Code sessions with “continue”.
To make that reliable, maintain a progress file at:

- `docs/proactive-recall/CLAUDE_PROGRESS.md`

Update it after every major completed step with:
- what changed
- which commands you ran
- what still remains
- any repo-specific deviations you discovered

## Product equation

proactive recall = right memory × right moment × fast enough × often silent × user still in control

## Existing infra

Do not rewrite capture/storage.

The fork already has or is intended to have:
- crates: `screenpipe-events`, `screenpipe-db`, `screenpipe-server`, `screenpipe-app-tauri`, `screenpipe-mcp`
- stub: `crates/screenpipe-recall/`
- docs: `docs/proactive-recall/`
- local SQLite + FTS episodic store
- localhost API
- Tauri desktop app

The public Screenpipe repo also shows:
- event-driven capture and app-switch semantics
- local SQLite ownership in `screenpipe-db`
- a separate Tauri app in `apps/screenpipe-app-tauri`
- root cargo workspace excludes `apps/screenpipe-app-tauri/src-tauri`

Treat the fork-local proactive-recall docs and stubs as the source of truth for names/signatures when they already exist.

## Read these files first

Before you code, open and read these files if they exist:

- `docs/proactive-recall/architecture.md`
- `docs/proactive-recall/roadmap.md`
- `docs/proactive-recall/interaction-model.md`
- `crates/screenpipe-recall/src/context.rs`
- `crates/screenpipe-recall/src/policy.rs`
- `crates/screenpipe-recall/src/decision.rs`
- `crates/screenpipe-server/src/**/search*.rs`
- `crates/screenpipe-server/src/**/routes*.rs`
- `crates/screenpipe-events/src/events_manager.rs`
- `crates/screenpipe-events/src/**`
- `crates/screenpipe-db/src/db.rs`
- `crates/screenpipe-db/src/types.rs`
- `crates/screenpipe-db/src/migrations/*`
- `apps/screenpipe-app-tauri/package.json`
- `apps/screenpipe-app-tauri/app/**`
- `apps/screenpipe-app-tauri/components/**`
- `apps/screenpipe-app-tauri/lib/**`
- `apps/screenpipe-app-tauri/src-tauri/src/**`
- `README.md`

If equivalent files exist with different names, use the equivalent existing files rather than duplicating functionality.

After reading, write a short repo-specific execution note into `docs/proactive-recall/CLAUDE_PROGRESS.md`, then immediately start implementing.

## Product definition

Proactive recall = the system silently watches for a strong context transition, retrieves the best prior local memory for the new context, evaluates whether surfacing it is justified, and either shows a small calm card or stays silent.

This is not:
- a chat feature
- a general daily summary
- a new capture pipeline
- a cloud feature
- an LLM-in-the-loop hot path
- a rewrite of `/search`
- a rewrite of MCP

## Non-negotiable acceptance criteria

Implement until all of these are true:

- On app switch and manual trigger, the system builds a real `RecallContext` from live Screenpipe data.
- It retrieves candidates via `screenpipe-db` and/or the existing `/search` capability with app/time/context filters. No LLM on the hot path.
- `RecallPolicy::evaluate` returns real `Surface | Defer | Silence` outcomes with confidence, cooldowns, and per-app caps.
- Decisions are persisted in SQLite in `recall_events`.
- Debug and manual operation work through:
  - `GET /recall/status`
  - `POST /recall/evaluate`
- Intervention UI exists in Tauri as a real card with:
  - snippet
  - why now
  - dismiss
  - snooze
  - never this app
- Low-confidence decisions default to `Silence`.
- All decisions are logged.
- The hot path is instrumented and documented with a target under 500 ms.
- `README.md` contains a proactive-recall section with:
  - build
  - run
  - dogfood
  - curl examples
- There is at least one integration test for policy and a manual QA script.

Do not declare success until all are done.

## Hard constraints

- Local-first; no cloud required
- No LLM in the hot path in v1
- Default to `Silence`
- Enforce cooldowns and per-app caps
- macOS-first UX polish
- Do not break Windows/Linux compilation if possible
- Do not replace `/search`
- Do not replace MCP
- Triggers in v1 are only:
  - `AppSwitch`
  - `Manual`
- Mention v2 triggers only as comments/TODOs:
  - typing pause
  - scroll stop
  - clipboard
  - idle fallback
- Prefer the smallest safe diff that produces working software

## What to build

### Build a real recall service

Implement a long-lived recall service that:

1. subscribes to app-switch signals from `screenpipe-events` or the existing equivalent event source
2. waits 300 ms after an app switch to let the focused window settle
3. constructs `RecallContext`
4. retrieves candidates from the local DB / search layer
5. evaluates policy
6. persists the decision and latency breakdown
7. if and only if policy says `Surface`, emits a live event to the Tauri UI

### Build a real tri-state policy

Implement actual policy outcomes:

- `Surface`
- `Defer`
- `Silence`

Do not leave enum variants unused.
Do not return placeholder confidence.
Do not create stub decisions.

### Build a real intervention UI

Implement a real Tauri recall card window or equivalent Tauri-native card UX that is actually shown on surfaced decisions.

The card must include:
- source app label
- snippet
- why now explanation built from deterministic reasons
- dismiss
- snooze
- never this app

No sound.
No modal.
No stack of multiple cards.
One card visible at a time.

### Build real persistence and debug routes

Persist every decision, including `Silence`, to SQLite.

Provide:
- `GET /recall/status`
- `POST /recall/evaluate`
- SSE stream for surfaced decisions and status updates if feasible:
  - `GET /recall/stream`

Also provide one action endpoint for the UI:
- `POST /recall/action`

## Recommended module split

Keep responsibilities separated like this unless the fork’s existing architecture strongly suggests equivalent names:

### In `crates/screenpipe-recall`

This crate should own:
- `RecallContext`
- `RecallTrigger`
- `RecallCandidate`
- `RecallDecision`
- `RecallAction`
- `RecallPolicy`
- retrieval orchestration
- deterministic tokenization / query construction
- cooldown / cap logic
- defer batching logic
- why-now generation
- service orchestration helpers
- tests for policy and retrieval normalization

### In `crates/screenpipe-db`

This crate should own:
- SQLite migration(s) for recall tables
- DB query helpers for:
  - latest app switch / latest frame lookup
  - retrieval candidate queries
  - insert recall events
  - update action feedback
  - read preferences and status
- reuse of the existing DB manager and write queue patterns

### In `crates/screenpipe-server`

This crate should own:
- lifecycle of the recall service
- event subscription wiring
- REST routes
- SSE endpoint
- route request/response types
- glue between server startup and recall service startup

### In `apps/screenpipe-app-tauri`

This app should own:
- hidden or utility recall-card window
- SSE subscription or equivalent live transport
- card rendering
- dismiss / snooze / never-this-app actions
- a manual trigger entry point
- a focus-mode toggle or existing-settings integration if possible

### In `crates/screenpipe-events`

Touch this only as needed to:
- consume app-switch events cleanly
- expose a stable recall trigger path
- avoid polling if the event stream already exists

## Concrete spec to implement

### `RecallTrigger`

Use:

```rust
pub enum RecallTrigger {
    AppSwitch,
    Manual,
}
```

If the existing stub enum already exists, preserve the existing public API and extend it as needed.

### `RecallAction`

Use:

```rust
pub enum RecallAction {
    Surface,
    Defer,
    Silence,
}
```

### `RecallContext`

Use a structure equivalent to this:

```rust
pub struct RecallContext {
    pub trigger: RecallTrigger,
    pub occurred_at: chrono::DateTime<chrono::Utc>,
    pub settled_at: chrono::DateTime<chrono::Utc>,

    pub active_frame_id: Option<i64>,
    pub active_ui_event_id: Option<i64>,

    pub active_app: String,
    pub active_window_title: Option<String>,

    pub browser_url: Option<String>,
    pub browser_domain: Option<String>,

    pub document_path: Option<String>,
    pub document_name: Option<String>,

    pub visible_text_excerpt: String,
    pub query_terms: Vec<String>,

    pub previous_app: Option<String>,
    pub previous_window_title: Option<String>,

    pub mode: RecallMode, // Normal | Meeting | Focus
    pub cold_start: bool,
    pub app_opt_out: bool,

    pub content_hash: Option<i64>,
    pub simhash: Option<i64>,
}
```

Also define a `RecallMode` enum:
- `Normal`
- `Meeting`
- `Focus`

### Context inference rules

Build `RecallContext` from live Screenpipe data using these rules:

1. On `AppSwitch`, wait 300 ms.
2. Read the latest matching app-switch `ui_event`.
3. Read the nearest frame within ±2 seconds.
4. Prefer a frame captured because of app switch if the fork stores trigger type.
5. Extract:
   - app name
   - window title
   - URL / domain
   - document path / basename
   - visible text excerpt from accessibility or consolidated full text
6. Create deterministic query terms from:
   - document basename
   - domain host
   - title tokens
   - top visible text tokens
7. Set `Meeting` mode if app/domain/title heuristics indicate conferencing:
   - Zoom
   - Meet / `meet.google.com`
   - Teams
   - Slack Huddle
   - FaceTime
   - Discord call
   Use whatever exact app/window/domain variants the fork already normalizes.
8. Set `Focus` mode from stored user preference if enabled.
9. Set `cold_start = true` when:
   - same-app history is sparse, or
   - there are zero strong anchors for same domain/document, or
   - a manual trigger was not used and the context is too weak

Do not use an LLM for context inference.

### Deterministic tokenizer

Implement a small deterministic tokenizer:
- lowercase
- split on non-word chars except `.`, `_`, `-`, `/`
- drop tokens shorter than 3 chars
- remove a small stopword list
- dedupe tokens
- keep max 8 tokens
- preserve quoted exact anchor terms for document names or title phrases where useful

Sanitize any FTS input.
Do not interpolate raw user strings directly into SQL.

### Retrieval behavior

Use local retrieval only.

Preferred implementation:
- query `screenpipe-db` directly with SQLite FTS helpers in the hot path
- keep existing `/search` untouched
- if the fork already has a good internal `/search` helper callable without HTTP, reuse it

Acceptable fallback:
- add or use existing app/time/window/url filters in `/search`
- but avoid an unnecessary HTTP self-call when direct DB access is already available

Use these retrieval passes:

1. same app, last 30 days, excluding most recent 15 minutes
2. same domain or same document basename, last 90 days, excluding most recent 15 minutes
3. manual-trigger fallback across all apps, last 30 days, only if the first two are sparse

Limit result counts aggressively.
Aim for small candidate sets.

Prefer frame/text episodes in v1.
Do not add embeddings or semantic rerankers to the hot path.

### Retrieval SQL shape

Implement a DB helper equivalent to this and adapt it to the fork’s real schema:

```sql
SELECT
    f.id AS frame_id,
    f.timestamp,
    f.app_name,
    f.window_name,
    f.browser_url,
    f.document_path,
    snippet(frames_fts, 0, '[', ']', '…', 18) AS snippet,
    bm25(frames_fts) AS bm25_score,
    f.content_hash,
    f.simhash
FROM frames_fts
JOIN frames f ON frames_fts.rowid = f.id
WHERE frames_fts MATCH ?1
  AND f.timestamp >= ?2
  AND f.timestamp < ?3
  AND (?4 IS NULL OR f.app_name = ?4)
  AND (
        ?5 IS NULL
        OR f.browser_url LIKE '%' || ?5 || '%'
        OR f.document_path LIKE '%' || ?6 || '%'
        OR f.window_name LIKE '%' || ?7 || '%'
      )
ORDER BY bm25(frames_fts), f.timestamp DESC
LIMIT ?8;
```

If the current schema uses different names, inspect and adapt.
Do not hardcode column names without checking.
Do not build a parallel search index unless absolutely necessary.

### Candidate normalization

Create a `RecallCandidate` struct with at least:
- frame id
- timestamp
- app name
- window title
- browser url
- document path
- snippet
- normalized bm25 score
- overlap features
- final confidence
- reason list
- defer group key

Normalize FTS scores across the retrieved result set because SQLite FTS scores are relative and typically lower-is-better.

### Confidence scoring

Use this exact v1 score shape unless the fork’s existing policy code makes a close equivalent cleaner:

```text
confidence =
  0.40 * normalized_fts
+ 0.18 * exact_document_match
+ 0.12 * same_domain_or_host_prefix
+ 0.10 * same_app
+ 0.10 * title_overlap
+ 0.08 * visible_text_overlap
+ 0.05 * recency_band
+ 0.05 * novelty_bonus
- 0.10 * duplicate_penalty
- 0.15 * prior_dismiss_penalty
```

Feature definitions:

- `exact_document_match` = 1.0 if document basename matches exactly, else 0.0
- `same_domain_or_host_prefix` = 1.0 if host matches or host + first path segment matches
- `same_app` = 1.0 if active app equals candidate app
- `title_overlap` = Jaccard overlap between normalized active title tokens and candidate title tokens
- `visible_text_overlap` = Jaccard overlap between normalized active visible-text terms and candidate snippet/full-text terms
- `recency_band`:
  - 1.0 for 2h–3d old
  - 0.6 for 3d–30d old
  - 0.3 for 30m–2h old
  - 0.1 for older than 30d
- `novelty_bonus` = 1.0 only if same context key has not already been surfaced in last 24h
- `duplicate_penalty` = 1.0 for equal `content_hash` or near-duplicate snippet
- `prior_dismiss_penalty` = 1.0 if the same frame/context was dismissed in the cooldown window

### Anchor classes

Treat these as independent anchor classes:
- same app
- exact document basename match
- same browser host / host prefix
- title overlap > 0.30
- visible-text overlap > 0.15

Policy rule:
- automatic `Surface` requires at least 2 anchor classes
- manual trigger may surface with 1 anchor class

### Policy thresholds

Implement these defaults in code and expose them in a simple config struct:

```rust
AUTO_SURFACE_THRESHOLD = 0.78;
AUTO_DEFER_THRESHOLD = 0.62;
MANUAL_SURFACE_THRESHOLD = 0.55;
MANUAL_DEFER_THRESHOLD = 0.45;

EXACT_CANDIDATE_COOLDOWN_HOURS = 8;
APP_SURFACE_COOLDOWN_MINUTES = 20;
GLOBAL_SURFACE_COOLDOWN_MINUTES = 2;

MAX_APP_SURFACES_PER_HOUR = 1;
MAX_APP_SURFACES_PER_DAY = 2;
MAX_GLOBAL_SURFACES_PER_DAY = 6;

DEFAULT_SNOOZE_MINUTES = 30;
DEFER_RECHECK_MINUTES = 10;
DEFER_EXPIRY_HOURS = 24;
```

### Policy semantics

Implement these semantics exactly:

- If disabled globally: `Silence`
- If app opt-out or gated deny: `Silence`
- If meeting mode and trigger is auto: `Silence`
- If focus mode and trigger is auto: `Silence`
- If cold start and trigger is auto: `Silence`
- If no candidates: `Silence`
- If exact candidate cooldown active and trigger is auto: `Silence`
- If app/global cooldown or caps active and trigger is auto: `Silence`
- If top candidate confidence >= surface threshold and anchor requirement passes: `Surface`
- Else if confidence >= defer threshold: `Defer`
- Else: `Silence`

Manual trigger behavior:
- bypass auto cooldowns and auto caps
- bypass meeting/focus suppression
- still log everything
- still prefer silence if no candidate is remotely plausible

### `RecallPolicy::evaluate`

Make it real.
Use an implementation at least this complete:

```rust
fn evaluate(
    ctx: &RecallContext,
    candidates: &[RecallCandidate],
    history: &RecallHistory,
    prefs: &RecallPreferences,
    now: DateTime<Utc>,
) -> RecallDecision
```

`RecallDecision` must include at least:
- `action`
- `confidence`
- `reason_primary`
- `reason_list`
- `why_now`
- `candidate`
- `cooldown_until`
- `deferred_until`
- `latency_breakdown`
- `debug_payload`

### Why-now generation

No LLM.
Generate a deterministic explanation from reason codes.

Use outputs like:
- `same app`
- `same document name`
- `same site/domain`
- `related window title`
- `last seen 2h ago`
- `manual recall`

Render them as chips or a short sentence.
Keep it fully explainable.

### Reuse pipe YAML gating

If the fork already has shared permission/gating helpers used by pipes, reuse them.

If there is no reusable helper, create a recall policy config that uses the same field names and semantics as pipe YAML where practical:

- `allow-apps`
- `deny-apps`
- `deny-windows`
- `time-range`
- `days`
- `allow-content-types`

Read an optional local config file if that is already a repo convention.
If not, keep the initial configuration in code plus DB preferences.
Do not introduce cloud config.

`Never this app` should persist without requiring file edits.
Store that in DB preferences.
It should effectively behave like a runtime merge into `deny-apps`.

### Persistence

Add SQLite storage for all decisions.

Create or modify a migration in:
- `crates/screenpipe-db/src/migrations/`

Implement these tables:

- `recall_events`
- `recall_app_preferences`
- `recall_runtime_settings`

Use these columns for `recall_events`:

- `id`
- `created_at`
- `trigger`
- `action`
- `confidence`
- `app_name`
- `window_title`
- `browser_url`
- `browser_domain`
- `document_path`
- `document_name`
- `context_key`
- `mode`
- `reason_primary`
- `reason_json`
- `query_text`
- `query_terms_json`
- `candidate_count`
- `top_candidate_frame_id`
- `top_candidate_timestamp`
- `top_candidate_app_name`
- `top_candidate_window_title`
- `top_candidate_browser_url`
- `top_candidate_document_path`
- `top_candidate_snippet`
- `top_candidate_score`
- `cooldown_until`
- `deferred_until`
- `deferred_group_key`
- `user_feedback`
- `snoozed_until`
- `latency_context_ms`
- `latency_retrieval_ms`
- `latency_policy_ms`
- `latency_persist_ms`
- `latency_total_ms`
- `debug_json`

Use TEXT timestamps in RFC3339 / ISO8601 format to match the surrounding DB style if that is already the repo convention.

### DB helper methods to implement

Implement or extend helper methods in `screenpipe-db` or equivalent:

- `recall_load_context(...)`
- `recall_query_candidates(...)`
- `recall_insert_event(...)`
- `recall_apply_action(...)`
- `recall_load_status(...)`
- `recall_load_history(...)`
- `recall_load_preferences(...)`
- `recall_set_focus_mode(...)`
- `recall_set_app_opt_out(...)`

Reuse the existing DB manager and write queue.
Do not add a separate connection stack unless the current architecture forces it.

### Hot-path instrumentation

Instrument these timings:
- context build
- retrieval
- policy
- persistence
- total

Persist them in `recall_events`.
Return the latest values in `/recall/status`.
Document them in `README.md`.

The goal is a warm-path server total under 500 ms.
If you are above 500 ms because of avoidable overhead, remove the overhead.
Examples of avoidable overhead:
- internal HTTP self-calls
- overfetching huge result sets
- duplicate queries
- JSON reparse loops
- unnecessary full-text scans without app/time filtering

### Runtime flow

Implement this runtime:

1. app switch event arrives
2. recall service waits 300 ms
3. context is built
4. candidates are retrieved
5. policy evaluated
6. event persisted
7. if decision is `Surface`, emit live event to UI
8. if decision is `Defer`, store pending state in DB and reconsider on the next eligible trigger
9. if decision is `Silence`, do nothing visible

Pending defer behavior:
- one deferred group per context key or app
- on next eligible trigger, if same context reappears and confidence is now high enough, surface it
- expire deferred items after 24 hours
- log defer events and later outcomes

### API contract

Implement these routes in `screenpipe-server` or equivalent existing route module.

#### `GET /recall/status`

Return JSON with at least:
- `enabled`
- `focus_mode`
- `meeting_mode`
- `pending_deferred`
- `last_context`
- `last_decision`
- `latency_ms`

#### `POST /recall/evaluate`

Accept body like:

```json
{
  "trigger": "manual",
  "dry_run": false,
  "override": null
}
```

Behavior:
- if `trigger=manual`, evaluate immediately
- if `dry_run=true`, do not emit the UI surface event but still return the computed decision
- if `override` fields are provided, allow local debug evaluation against synthetic context
- log the event even in dry-run if that is useful for debug, or document if you intentionally do not

Return:
- `event_id`
- `decision`

#### `POST /recall/action`

Accept:
- `event_id`
- `action`: `dismiss | snooze | never_app`
- `snooze_minutes` when needed

Behavior:
- `dismiss` updates feedback and cooldowns
- `snooze` sets `snoozed_until`
- `never_app` persists app opt-out immediately

#### `GET /recall/stream`

Implement SSE if practical.
Emit:
- `recall.surface`
- `recall.status`
- `recall.action_applied`

SSE is preferred because the UI only needs one-way updates.

If SSE is difficult in this fork, use an equivalent Tauri/Rust event bridge for the desktop UI, but still keep `GET /recall/status` and `POST /recall/evaluate` working over HTTP.

### Tauri UI spec

Implement a real recall card.

Preferred approach:
- create a small hidden utility window for recall
- keep it ready in the background
- when a `recall.surface` event arrives, populate it and show it

Card requirements:
- source label, e.g. active app
- snippet from the candidate
- visible “Why now” explanation
- `Dismiss`
- `Snooze`
- `Never this app`

Behavior:
- always-on-top
- non-modal
- no sound
- one card at a time
- auto-hide after 12 seconds unless hovered
- pressing `Esc` dismisses
- if a stronger card arrives while one is open, replace or queue a single pending one
- macOS-first polish for placement and chrome
- if the exact placement APIs differ, still ship a working desktop card

Manual trigger entry points:
- add at least one obvious manual trigger path in the app
- prefer existing settings/debug UI and/or existing tray plumbing if already present
- manual trigger should call `POST /recall/evaluate`

Focus mode:
- add a simple focus toggle in settings or existing app controls
- store it in `recall_runtime_settings`
- while focus mode is on, auto surfaces become `Silence`

Meeting mode:
- inferred automatically
- no user interaction required for basic suppression

### File targets

Prefer these files if they do not already exist; otherwise modify the fork’s nearest equivalent:

#### `crates/screenpipe-recall`
- `crates/screenpipe-recall/src/lib.rs`
- `crates/screenpipe-recall/src/context.rs`
- `crates/screenpipe-recall/src/policy.rs`
- `crates/screenpipe-recall/src/decision.rs`
- `crates/screenpipe-recall/src/retrieval.rs`
- `crates/screenpipe-recall/src/service.rs`
- `crates/screenpipe-recall/src/store.rs`
- `crates/screenpipe-recall/src/config.rs`
- `crates/screenpipe-recall/tests/policy_integration.rs`

#### `crates/screenpipe-db`
- `crates/screenpipe-db/src/db.rs`
- `crates/screenpipe-db/src/types.rs`
- `crates/screenpipe-db/src/migrations/*_add_recall_tables.sql`

#### `crates/screenpipe-server`
- `crates/screenpipe-server/src/**/recall*.rs`
- `crates/screenpipe-server/src/**/routes*.rs`
- `crates/screenpipe-server/src/lib.rs` or `main.rs` or equivalent startup file

#### `crates/screenpipe-events`
- `crates/screenpipe-events/src/events_manager.rs`
- any existing custom event module if needed

#### `apps/screenpipe-app-tauri`
- `apps/screenpipe-app-tauri/lib/recall-client.ts`
- `apps/screenpipe-app-tauri/components/recall/RecallCard.tsx`
- `apps/screenpipe-app-tauri/components/recall/RecallControls.tsx`
- `apps/screenpipe-app-tauri/app/**/recall*`
- `apps/screenpipe-app-tauri/src-tauri/src/**/recall*.rs`
- `apps/screenpipe-app-tauri/src-tauri/src/main.rs` or equivalent
- settings/debug UI files as needed

#### docs and readme
- `README.md`
- `docs/proactive-recall/CLAUDE_PROGRESS.md`
- `docs/proactive-recall/manual-qa.md`

Do not create duplicate parallel implementations if the fork already has a clear place for the functionality.

### Implementation order

Execute in this sequence.
After each step, update `docs/proactive-recall/CLAUDE_PROGRESS.md`.

1. Read the proactive-recall docs and stubs, inspect repo equivalents, and write the initial repo-specific execution note.
2. Add DB migration(s) and DB helper methods for recall events, preferences, and status/history queries.
3. Flesh out `screenpipe-recall` domain types, retrieval logic, tokenizer, scoring, cooldowns, defer semantics, and why-now generation.
4. Implement a real `RecallPolicy::evaluate` with `Surface | Defer | Silence`.
5. Wire the recall service into `screenpipe-server` startup and connect it to app-switch/manual triggers.
6. Add `GET /recall/status`, `POST /recall/evaluate`, `POST /recall/action`, and `GET /recall/stream`.
7. Implement the Tauri recall card UI and wire it to live events and action endpoints.
8. Add manual trigger and focus toggle in the app.
9. Add tests:
   - at least one integration test for policy
   - ideally a second test for cooldowns or app caps
10. Update `README.md` with build/run/dogfood/curl docs and write `docs/proactive-recall/manual-qa.md`.
11. Run formatting, build, and tests in every required workspace/app location.
12. Fix all compile/test failures.
13. Do a final pass for dead code, unused variants, and obvious UX rough edges.

### Definition of done

You are not done until these are all true:

- [ ] `RecallContext` is built from live Screenpipe data on app switch
- [ ] manual trigger works
- [ ] retrieval is local and hot-path-safe
- [ ] `RecallPolicy::evaluate` returns real `Surface | Defer | Silence`
- [ ] cooldowns work
- [ ] per-app caps work
- [ ] `recall_events` persistence works
- [ ] `GET /recall/status` works
- [ ] `POST /recall/evaluate` works
- [ ] `POST /recall/action` works
- [ ] Tauri card appears for `Surface`
- [ ] card shows snippet and why-now
- [ ] dismiss works
- [ ] snooze works
- [ ] never-this-app works and persists
- [ ] low confidence defaults to `Silence`
- [ ] all decisions are logged
- [ ] latency breakdown is recorded and documented
- [ ] README proactive-recall section exists
- [ ] manual QA script exists
- [ ] at least one integration test exists and passes
- [ ] compile errors are fixed
- [ ] tests have been run in all required Rust/app locations

## Tests and verification

Run the relevant commands that match the fork’s actual scripts.

At minimum:
- root rust tests for recall/server/db crates
- app `src-tauri` rust tests/build
- frontend tests/lint/build where available

Because the public repo excludes `apps/screenpipe-app-tauri/src-tauri` from the root cargo workspace, make sure you explicitly run commands there too.

Use the repo’s actual package manager.
If `bun.lock` is present and the app uses bun scripts, prefer bun.

Target command checklist:
- `cargo fmt`
- targeted `cargo test` for recall/server/db crates
- targeted `cargo test` in `apps/screenpipe-app-tauri/src-tauri`
- frontend tests or lint in `apps/screenpipe-app-tauri`
- one build path that proves the app still compiles

Add curl examples to `README.md`, for example:

```bash
curl http://127.0.0.1:3030/recall/status

curl -X POST http://127.0.0.1:3030/recall/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"trigger":"manual","dry_run":false,"override":null}'

curl -X POST http://127.0.0.1:3030/recall/action \
  -H 'Content-Type: application/json' \
  -d '{"event_id":1,"action":"snooze","snooze_minutes":30}'
```

### Required integration test cases

Implement at least one, preferably three:

1. strong same-document candidate, no cooldown, no cap => `Surface`
2. low-support candidate, weak anchors => `Silence`
3. strong candidate but exact cooldown active or app cap reached => `Silence` or `Defer` according to spec

### Required manual QA script

Create `docs/proactive-recall/manual-qa.md` with step-by-step instructions that include:

- start the app/server
- confirm `GET /recall/status`
- open an app/window with a recognizable document or site
- switch away and back to trigger app-switch evaluation
- verify surface if confidence is high enough
- verify silence on a blank/weak context
- verify dismiss
- verify snooze
- verify never-this-app
- verify manual trigger still works
- verify latency output is visible in status or DB rows

## README requirements

Add a `Proactive recall` section to `README.md` that includes:

- what proactive recall is
- triggers in v1
- hot-path constraints
- how to run it
- how to manually trigger it
- curl examples
- dogfooding notes
- where latency is recorded
- how to opt out per app

Keep it concise but sufficient.

## macOS-first UX requirements

Polish the visible UX for macOS first.
That means:
- recall card looks native enough and unobtrusive
- placement is reasonable on macOS
- no focus steal
- no sound
- no dock/taskbar clutter if avoidable

For Windows/Linux:
- prefer compile-safe and functional over polished
- use `cfg` guards if necessary
- avoid introducing macOS-only dependencies in shared crates

## When stuck

Do not stop.
Choose the smallest working fallback that still meets the acceptance criteria.

Use these fallback decisions:

- If clean event subscription is hard, poll only the latest relevant app-switch row at a low interval inside the server as a temporary fallback, but keep v1 triggers limited to `AppSwitch` and `Manual`.
- If the existing `/search` route lacks the right filters, query `screenpipe-db` directly in the hot path and leave `/search` behavior unchanged.
- If SSE is awkward in this fork, use a Tauri/Rust event bridge for the desktop UI, but keep `GET /recall/status` and `POST /recall/evaluate` working over HTTP.
- If card placement APIs are messy, ship a working recall card first, then do macOS placement polish second.
- If a policy branch is ambiguous, prefer `Silence`.
- If a context is privacy-sensitive or uncertain, prefer `Silence`.
- If meeting detection is noisy, prefer `Silence`.
- If a conflict exists between “more proactive” and “more controllable,” choose controllable.

## Final output from this coding session

When you finish, output a concise implementation summary that includes:
- files changed
- migrations added
- routes added
- tests run
- exact commands run
- whether acceptance criteria are all satisfied
- any remaining known issues only if they are minor and do not block the acceptance criteria

Then stop.
Do not ask the user to do the implementation manually.
Do the work.
```