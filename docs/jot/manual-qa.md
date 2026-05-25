# Jot — manual QA checklist

Run after `./scripts/run-dev.sh` or `cd jot && npm start`. Grant **Screen Recording**, **Automation**, and **Accessibility** when prompted.

---

## Setup

- [ ] App window title shows **Jot**
- [ ] Tabs: **Notes**, **Recordings**, **Jot**
- [ ] Engine dot / status shows **running** (after ~30s)
- [ ] `curl -sf http://127.0.0.1:3030/health` returns OK

---

## Notes (Capture · Find)

- [ ] **⌘N** opens capture; save a plain note
- [ ] **⌘P** opens search; empty query shows recent notes
- [ ] Search finds note by keyword; **Enter** opens editor
- [ ] Folder create/rename works

---

## Recordings (Query)

- [ ] **Recordings** tab → **Search**: query finds text from recent screen activity
- [ ] Engine stopped (`SCREENPIPE_ENABLED=false`) → clear offline message; notes still work
- [ ] **Ask**: query returns cards with timestamp / app citation
- [ ] Results separate **Note** vs **Screen** badges

---

## Resurface

- [ ] `remind me to TEST when i open Notes` → switch to linked app → overlay shows note
- [ ] `remind me in 3 min to TIME_TEST` → overlay within ~4 min
- [ ] **⌘⇧R** manual recall surfaces a linked note (or capture fallback)
- [ ] Dismiss / snooze on overlay works
- [ ] Rapid app switching does not stack multiple overlays

---

## Jot agent

- [ ] **Jot** tab opens; **⌘⇧P** focuses Jot
- [ ] Without API key → clear message to add key
- [ ] With key: “What does ⌘⇧R do?” answers from product knowledge (no wrong shortcuts)
- [ ] With key: “list my last 5 notes” returns results
- [ ] Bulk move asks **Confirm** before applying

---

## Ship preflight

```bash
cd jot && npm run preflight
```

- [ ] 0 failures (warnings for icon/notarization OK)

---

## Build (optional)

```bash
./scripts/build-engine.sh
cd jot && npm run dist:arm64
```

- [ ] `dist/Jot-2.1.0.dmg` opens and app launches
