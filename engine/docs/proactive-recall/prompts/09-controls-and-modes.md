# Phase 09 — Controls & modes

## Goal

Manual trigger entry point, focus toggle, meeting suppression polish.

## Read first

- `docs/proactive-recall/reference/POLICY.md` (manual, meeting, focus)
- Settings/tray UI locations in Tauri app

## Tasks

1. **Manual trigger** — button/hotkey/tray item calling `POST /recall/evaluate` with `trigger: manual`.
2. **Focus mode toggle** — settings UI → `recall_set_focus_mode` / `recall_runtime_settings`; auto triggers → Silence.
3. **Meeting mode** — verify heuristics in context builder suppress auto surface; status reflects `meeting_mode`.
4. **Never this app** — ensure DB preference merges into deny/opt-out for policy.
5. **Global enabled** — if not present, add `enabled` flag in runtime settings + status.

## Exit criteria

- [ ] Manual trigger works end-to-end (card or logged Silence)
- [ ] Focus on → auto app-switch does not surface; manual still can
- [ ] Meeting inferred → auto Silence (test with mocked context or real Zoom/Meet if available)
- [ ] Phase 09 checked in progress file

## Verification

Manual QA steps 1–6 from upcoming `manual-qa.md` (draft partial script if phase 10 not done).

## Do not

- Skip README/docs (phase 10)
