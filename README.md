# PakrAI

Local-first macOS app: **notes**, **screen recording**, **query your recordings**, proactive **resurface** (time + context), and **Pakr** agent for note reorganization.

**Build spec:** [`../docs/pakrai/README.md`](../docs/pakrai/README.md)

## Quick start

```bash
npm install
export SCREENPIPE_API_KEY=dev-key-123
npm start
```

From workspace root: `../scripts/run-dev.sh` (builds engine if needed).

## Tests

```bash
npm test
npm run preflight   # before release build
```

## Release

```bash
../scripts/build-engine.sh
npm run dist:arm64
```

Artifact: `dist/PakrAI-2.1.0.dmg`

## Permissions

- **Screen Recording** — capture + query
- **Automation** — frontmost app for resurfacing
- **Accessibility** — recommended

## Docs

- [PakrAI manual QA](../docs/pakrai/manual-qa.md)
- [Technical deep dive](docs/repository-summary.md)
