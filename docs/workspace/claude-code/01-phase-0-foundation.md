# Phase 0 — Foundation (engine sidecar + Jot client)

**PRD ref:** §11 Phase 0, §7.1 E1–E4  
**Goal:** Jot can start/monitor Screenpipe and call recall evaluate (dry-run OK).

---

## Read first

- `PRD.md` §9 (architecture)
- `engine/PROACTIVE_RECALL.md` (build/run engine)
- `engine/docs/engine/reference/API.md`
- `jot/app-main.js`, `jot/appWatcher.js` (lifecycle hooks)

---

## Tasks

### 1. `integration/` — engine manager

Create `integration/engineManager.js` (or `.ts` if you add tooling):

- Resolve `screenpipe` binary path (dev: `engine/target/release/screenpipe` or `cargo run` documented; env override `SCREENPIPE_BIN`)
- `start()` / `stop()` / `isRunning()`
- Poll `GET http://127.0.0.1:3030/health` with timeout
- Exponential backoff restart (max 3 tries per minute)
- Read `SCREENPIPE_LOCAL_API_KEY` from env; document fallback for dev

Export a small API for Jot main process.

### 2. `integration/recallClient.js`

- `getStatus()` → `GET /recall/status` (graceful error if 404 — recall not built yet)
- `evaluate({ trigger, dryRun })` → `POST /recall/evaluate`
- `postAction({ eventId, action, snoozeMinutes })` → `POST /recall/action`
- Optional: `subscribeStream(onEvent)` → `GET /recall/stream` SSE

All requests send `Authorization: Bearer <key>` except `/health`.

### 3. Wire into Jot

In `jot/` (minimal invasive diff):

- On `app.ready`, call engine manager `start()` (config flag `SCREENPIPE_ENABLED=true` default in dev)
- Tray or menu item: **Engine status** (running / stopped / error)
- Dev menu or shortcut: **Manual recall (dry-run)** → `evaluate({ trigger: 'manual', dryRun: true })` → log JSON to console or small debug panel
- Do **not** change overlay surfacing logic yet

### 4. Docs

- Update workspace `README.md`: how to build engine, set API key, run Jot with sidecar
- Add `docs/claude-code/dev-setup.md` if README would get too long

---

## Exit criteria

- [ ] `integration/engineManager.js` + `integration/recallClient.js` exist and are required from Jot
- [ ] With engine running, `curl http://127.0.0.1:3030/health` succeeds
- [ ] Jot starts engine in dev (or clear message if binary missing)
- [ ] Manual dry-run evaluate callable from Jot (logs decision or API error)
- [ ] No secrets committed

---

## Verification

```bash
# Build engine (from engine/)
cd engine && cargo build --release --features metal,apple-intelligence

# Health (separate terminal or after Jot starts sidecar)
curl -s http://127.0.0.1:3030/health

# Jot tests
cd . && npm test
```

Document API key setup in `dev-setup.md`.

---

## Do not

- Implement full recall policy in this phase
- Replace `surfaceEngine.js` yet
- Bundle engine into `.dmg` (phase 3)

---

## On completion

Update `CLAUDE_PROGRESS.md` → phase 0 ✅, proceed to `02-phase-1-recall-backend.md`.
