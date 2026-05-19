# Policy — scoring, thresholds, semantics

## Confidence formula (v1)

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

Normalize FTS scores across the candidate set (SQLite BM25: lower is better).

## Anchor classes (independent)

- same app
- exact document basename
- same browser host / host-prefix
- title overlap > 0.30
- visible-text overlap > 0.15

**Auto Surface:** confidence ≥ threshold **and** ≥ 2 anchor classes.  
**Manual Surface:** ≥ 1 anchor class allowed.

## Defaults

```text
AUTO_SURFACE_THRESHOLD = 0.78
AUTO_DEFER_THRESHOLD = 0.62
MANUAL_SURFACE_THRESHOLD = 0.55
MANUAL_DEFER_THRESHOLD = 0.45

EXACT_CANDIDATE_COOLDOWN_HOURS = 8
APP_SURFACE_COOLDOWN_MINUTES = 20
GLOBAL_SURFACE_COOLDOWN_MINUTES = 2
MAX_APP_SURFACES_PER_HOUR = 1
MAX_APP_SURFACES_PER_DAY = 2
MAX_GLOBAL_SURFACES_PER_DAY = 6

DEFAULT_SNOOZE_MINUTES = 30
DEFER_RECHECK_MINUTES = 10
DEFER_EXPIRY_HOURS = 24
```

## Auto-trigger Silence when

disabled, app opt-out, pipe-style deny gate, meeting mode, focus mode, cold start, no candidates, exact candidate cooldown, global/app cooldown, hourly/daily caps, low confidence.

## Manual trigger

Bypasses auto cooldowns, caps, meeting/focus — still logs; Silence if no plausible candidate.

## Why-now (no LLM)

Template chips: `same app`, `same document name`, `same site/domain`, `related window title`, `last seen 2h ago`, `manual recall`.

## Retrieval passes

1. Same app, 30 days, exclude last 15 minutes
2. Same domain or document basename, 90 days, exclude last 15 minutes
3. Manual-only fallback: all apps 30 days if sparse

Limit result sets; dedupe by `frame_id`, then `content_hash`.

## Cold start

`cold_start=true` when same-app history sparse or zero strong domain/document anchors → auto Silence.
