# PakrAI releases

**Product:** [PakrAI](https://github.com/parthha12/PakrAI) — local-first notes, screen query, proactive resurfacing, Pakr agent.

## Build

```bash
../proactive-recall/target/release/screenpipe   # or build from proactive-recall repo
cd "$(dirname "$0")"
npm run preflight
npm run dist:arm64    # Apple Silicon
# npm run dist:universal
```

Artifact: `dist/PakrAI-<version>.dmg`

## Install

See [INSTALL.md](./INSTALL.md).

## Spec

Full product/build docs: [docs/pakrai/README.md](./docs/pakrai/README.md)
