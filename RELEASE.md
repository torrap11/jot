# Pakr Notes releases

**Product:** [Pakr Notes](https://github.com/parthha12/PakrAI) — local-first notes, screen query, proactive resurfacing, Pakr agent.

## Build

```bash
../proactive-recall/target/release/screenpipe   # or build from proactive-recall repo
cd "$(dirname "$0")"
npm run preflight
npm run dist:arm64    # Apple Silicon
# npm run dist:universal
```

Artifact: `dist/PakrNotes-<version>.dmg` — latest: [v2.2.0](https://github.com/parthha12/PakrAI/releases/tag/v2.2.0)

## Install

See [INSTALL.md](./INSTALL.md).

> **macOS Gatekeeper:** The app is not yet notarized (no Apple Developer ID). After downloading, users must run:
>
> ```bash
> xattr -cr "/Applications/Pakr Notes.app"
> ```
>
> This will no longer be needed once we ship a signed + notarized build.

## Spec

Full product/build docs: [docs/pakrai/README.md](./docs/pakrai/README.md)
