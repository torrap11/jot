# Jot releases

**Product:** [Jot](https://github.com/parthha12/jot) — local-first notes, AI-powered organization, proactive resurfacing, Jot AI agent.

## Build

```bash
cd jot
npm run preflight
npm run dist:arm64    # Apple Silicon
# npm run dist:universal
```

Artifact: `dist/Jot-<version>.dmg` — latest: [v2.2.1](https://github.com/parthha12/jot/releases/latest)

## Install

See [INSTALL.md](./INSTALL.md).

> **macOS Gatekeeper:** The app is not yet notarized (no Apple Developer ID). After downloading, users must run:
>
> ```bash
> xattr -cr "/Applications/Jot.app"
> ```
>
> This will no longer be needed once we ship a signed + notarized build.

## Spec

Full product/build docs: [docs/jot/README.md](./docs/jot/README.md)
