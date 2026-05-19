# Phase 05 — Policy & scoring

## Goal

Real `RecallPolicy::evaluate` → Surface | Defer | Silence with tests.

## Read first

- `docs/proactive-recall/reference/POLICY.md` (full)
- `crates/screenpipe-recall/src/policy.rs` if stub exists

## Tasks

1. **`policy.rs`:** Implement confidence formula, anchor class counting, cooldown/cap checks, defer semantics.
2. **`RecallHistory`:** load from `recall_events` via db helpers — surfaces today, per-app counts, exact candidate cooldown, defer groups.
3. **`why_now`:** deterministic reason codes → chips/list (no LLM).
4. **`RecallDecision`:** action, confidence, reason_primary, reason_list, why_now, candidate, cooldown_until, deferred_until, latency_breakdown, debug_payload.
5. **Defer:** store deferred_group_key; recheck on next trigger; expire 24h (logic in policy + documented for service phase).
6. **Reuse pipe YAML gating** if fork has shared helpers; else minimal deny-apps merge from DB prefs + `never_app`.

### Policy tests (`tests/policy_integration.rs`)

Required cases:

| Case | Expected |
|------|----------|
| Strong same-document, no cooldown, 2+ anchors | `Surface` |
| Weak anchors / low score | `Silence` |
| Strong candidate but exact cooldown or app cap | `Silence` or `Defer` per spec |

Use synthetic `RecallContext` + candidates + history — no Tauri.

## Exit criteria

- [ ] All three policy tests pass
- [ ] Manual trigger bypasses auto cooldowns in tests
- [ ] Phase 05 checked in progress file

## Verification

```bash
cargo test -p screenpipe-recall -- policy
cargo fmt
```

## Do not

- Start HTTP server or Tauri yet
