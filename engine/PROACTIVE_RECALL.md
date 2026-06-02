# Proactive recall (engine/)

**Proactive recall = right memory × right moment × fast enough × often silent × user still in control.**

This directory is the Rust **engine** inside the [Jot monorepo](https://github.com/parthha12/jot). It is upstream [Screenpipe](https://github.com/screenpipe/screenpipe) plus proactive-recall research and the `screenpipe-recall` crate.

> **Note:** This code formerly lived in `parthha12/proactive-recall`. Clone only `parthha12/jot` — the engine is at `engine/`.

## Repo layout (verified)

| Path | Purpose |
|------|---------|
| `crates/screenpipe-engine` | Local API server (`screenpipe` binary), routes — **add `/recall/*` here** |
| `crates/screenpipe-db` | SQLite, FTS, migrations |
| `crates/screenpipe-events` | App-switch / UI events |
| `crates/screenpipe-recall` | Proactive recall domain (stub → implement via prompts) |
| `apps/screenpipe-app-tauri` | Desktop UI (Next.js + Tauri) |
| `docs/proactive-recall/` | Sequential Claude Code prompts |

See [`docs/proactive-recall/reference/UPSTREAM.md`](docs/proactive-recall/reference/UPSTREAM.md) for upstream sync notes.

## One-time setup

```bash
# From repo root
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

That installs `apps/screenpipe-app-tauri` JS deps (fixes **Tailwind CSS IntelliSense** / `tailwindcss-animate` errors) and runs a Rust smoke `cargo check`.

**macOS deps** (from upstream `CONTRIBUTING.md`):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
brew install pkg-config ffmpeg jq cmake wget git-lfs
# Xcode from App Store + xcodebuild -runFirstLaunch
```

Reload the editor window after `bun install` if Tailwind warnings remain.

## Build & run Screenpipe (before recall features)

```bash
# CLI / engine (from repo root)
cargo build --release --features metal,apple-intelligence
./target/release/screenpipe

# Desktop app
cd apps/screenpipe-app-tauri
bun install   # if you skipped setup-dev.sh
bun run tauri dev --features metal,apple-intelligence
```

API default: `http://127.0.0.1:3030` (e.g. `curl http://127.0.0.1:3030/search?q=test`).

Tauri Rust lives in `apps/screenpipe-app-tauri/src-tauri` — **outside** the root Cargo workspace; run `cargo` there when working on the shell.

## Build proactive recall (Claude Code)

Paste at **repo root**:

```
docs/proactive-recall/prompts/00-START.md
```

- Pipeline: [`docs/proactive-recall/README.md`](docs/proactive-recall/README.md)
- Research: [`docs/proactive-recall.md`](docs/proactive-recall.md)
- Progress: [`docs/proactive-recall/CLAUDE_PROGRESS.md`](docs/proactive-recall/CLAUDE_PROGRESS.md)

## Upstream sync

```bash
git fetch screenpipe-upstream main
git merge screenpipe-upstream/main   # or rebase; resolve conflicts keeping docs/proactive-recall/
```
