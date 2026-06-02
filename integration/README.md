# Integration — Screenpipe × Jot

Bridge between the Jot Electron shell and the Rust engine in `engine/`:

- `engineManager.js` — spawn and health-check the `screenpipe` sidecar
- `screenpipeClient.js` — REST client for localhost:3030
- `recallClient.js` — proactive recall API

All product code lives in this repo: app at repo root, engine in `engine/`.
