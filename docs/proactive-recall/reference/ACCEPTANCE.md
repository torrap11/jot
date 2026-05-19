# Acceptance criteria — definition of done

Do not mark the pipeline complete until **all** are true:

- [ ] `RecallContext` built from live data on app switch
- [ ] Manual trigger works
- [ ] Retrieval is local; no LLM on hot path
- [ ] `RecallPolicy::evaluate` returns real Surface | Defer | Silence
- [ ] Cooldowns and per-app caps enforced
- [ ] `recall_events` persistence for every decision
- [ ] `GET /recall/status` works
- [ ] `POST /recall/evaluate` works
- [ ] `POST /recall/action` works
- [ ] Tauri card appears on Surface
- [ ] Card shows snippet + why-now
- [ ] Dismiss, snooze, never-this-app work and persist
- [ ] Low confidence → Silence by default
- [ ] Latency breakdown in DB + status
- [ ] README proactive-recall section + curl examples
- [ ] `manual-qa.md` exists
- [ ] ≥1 integration test passes (policy; ideally cooldowns too)
- [ ] `cargo fmt` + tests pass in root crates **and** `src-tauri`
