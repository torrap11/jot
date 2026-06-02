# START — PakrAI build orchestrator

Read [SCOPE.md](./SCOPE.md) first. PakrAI includes **notes + screen recording + query recordings**; not mic/camera.

---

## Read order

1. [SCOPE.md](./SCOPE.md)  
2. [VISION.md](./VISION.md)  
3. [QUERY-RECORDINGS.md](./QUERY-RECORDINGS.md)  
4. [REQUIREMENTS.md](./REQUIREMENTS.md)  
5. [ARCHITECTURE.md](./ARCHITECTURE.md)  
6. [PHASES.md](./PHASES.md)  

---

## Verify workspace

```bash
test -f jot/package.json
test -f engine/Cargo.toml
./scripts/build-engine.sh   # if binary missing
cd . && npm test
./scripts/verify-stack.sh
```

---

## Phases

**P0** branding · **P6** query recordings · **P1** time · **P2** Pakr · **P3–P5** polish/ship

**Do not** remove engine or Rewind/Ask in P0—**rebrand** in P6.

---

## Locked

| Topic | Decision |
|-------|----------|
| Recording | Yes — Screenpipe engine |
| Query | User-initiated; `/search`, memories, Ask UI |
| Overlay | Notes-first; no LLM on switch |
| Mic/camera | Out v1 |

---

## Scope creep guard

In scope: screen OCR query, engine, recordings panel.  
Out: microphone, camera, cloud sync, LLM on proactive overlay.
