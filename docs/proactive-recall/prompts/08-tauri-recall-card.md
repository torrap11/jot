# Phase 08 — Tauri recall card

## Goal

Real intervention UI: one calm card, wired to SSE and action API.

## Read first

- `docs/proactive-recall/reference/API.md`
- `docs/proactive-recall/reference/PRODUCT.md` (UI constraints)
- Existing Tauri window patterns in `apps/screenpipe-app-tauri`

## Tasks

### Frontend (TypeScript/React per fork conventions)

- `lib/recall-client.ts` — SSE subscribe, POST action, POST evaluate
- `components/recall/RecallCard.tsx` — snippet, why-now chips, controls
- `components/recall/RecallControls.tsx` — Dismiss, Snooze, Never this app

### Tauri (Rust)

- Hidden utility window for recall card (or fork-equivalent pattern)
- Show on `recall.surface`; populate from payload
- POST actions to `/recall/action`

### Card behavior

- Always-on-top, non-modal, **no sound**
- One card at a time; replace if higher confidence arrives
- Auto-hide after **12s** unless hovered
- `Esc` → dismiss
- ~380px wide, max ~220px tall; macOS top-right when placement API available

### SSE fallback

If SSE awkward: Tauri event bridge from Rust — still keep HTTP evaluate/status. Document choice in `CLAUDE_PROGRESS.md`.

## Exit criteria

- [ ] Manual `POST /recall/evaluate` with real Surface decision shows card
- [ ] Dismiss, snooze, never-app hit API and persist feedback
- [ ] Phase 08 checked in progress file

## Verification

```bash
# frontend
cd apps/screenpipe-app-tauri && bun run build  # or npm/pnpm per fork
# rust
cd apps/screenpipe-app-tauri/src-tauri && cargo build
```

Dogfood: trigger surface via manual evaluate.

## Do not

- Add settings/focus toggle yet (phase 09)
