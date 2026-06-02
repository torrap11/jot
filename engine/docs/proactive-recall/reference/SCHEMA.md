# Database schema — recall tables

Add via `screenpipe-db` migrations. Use RFC3339 TEXT timestamps if that matches existing Screenpipe style.

## `recall_events`

```sql
CREATE TABLE IF NOT EXISTS recall_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    trigger TEXT NOT NULL,
    action TEXT NOT NULL,
    confidence REAL NOT NULL,
    app_name TEXT,
    window_title TEXT,
    browser_url TEXT,
    browser_domain TEXT,
    document_path TEXT,
    document_name TEXT,
    context_key TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'normal',
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
    user_feedback TEXT,
    snoozed_until TEXT,
    latency_context_ms INTEGER NOT NULL DEFAULT 0,
    latency_retrieval_ms INTEGER NOT NULL DEFAULT 0,
    latency_policy_ms INTEGER NOT NULL DEFAULT 0,
    latency_persist_ms INTEGER NOT NULL DEFAULT 0,
    latency_total_ms INTEGER NOT NULL DEFAULT 0,
    debug_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(top_candidate_frame_id) REFERENCES frames(id)
);
```

Indexes: `created_at`, `(action, created_at)`, `(context_key, created_at)`, `(app_name, created_at)`, `(top_candidate_frame_id, created_at)`.

## `recall_app_preferences`

```sql
CREATE TABLE IF NOT EXISTS recall_app_preferences (
    app_name TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    never_surface INTEGER NOT NULL DEFAULT 0,
    snooze_until TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
```

## `recall_runtime_settings`

```sql
CREATE TABLE IF NOT EXISTS recall_runtime_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
```

## DB helper methods (implement in `screenpipe-db`)

- `recall_load_context(...)`
- `recall_query_candidates(...)`
- `recall_insert_event(...)`
- `recall_apply_action(...)`
- `recall_load_status(...)`
- `recall_load_history(...)`
- `recall_load_preferences(...)`
- `recall_set_focus_mode(...)`
- `recall_set_app_opt_out(...)`

Reuse existing DB manager + write queue — no second connection stack.
