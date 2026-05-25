# Jot — constraints

[SCOPE.md](./SCOPE.md)

---

## LLM

| Path | LLM? |
|------|------|
| App switch overlay | **No** |
| Recordings **search** | **No** (FTS) |
| Recordings **ask** | **Optional** (user-initiated) |
| Jot AI agent | **Yes** |

---

## Recording

- **Screen recording:** in scope; local only.  
- **Microphone / camera:** out of scope v1.  

---

## Product

- Engine in Rust; query via `:3030` from Electron.  
- Proactive overlay: notes-first.  
- Do not require separate Screenpipe Tauri app for daily use.

---

## Testing

```bash
cd jot && npm test
./scripts/verify-stack.sh
```
