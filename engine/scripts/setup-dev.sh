#!/usr/bin/env bash
# Local dev setup for proactive-recall (Screenpipe + recall docs).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/apps/screenpipe-app-tauri"

echo "==> proactive-recall dev setup"
echo "Root: $ROOT"

if ! command -v bun >/dev/null 2>&1; then
  echo "Install bun: https://bun.sh"
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "Install Rust (rustup): https://rustup.rs"
  echo "On macOS also: brew install pkg-config ffmpeg jq cmake wget git-lfs"
  exit 1
fi

echo "==> JS deps (fixes Tailwind IntelliSense: tailwindcss-animate, etc.)"
(cd "$APP" && bun install)

echo "==> Rust toolchain (from rust-toolchain.toml)"
(cd "$ROOT" && rustup show active-toolchain 2>/dev/null || true)

echo "==> cargo check (recall stub + core crates)"
(cd "$ROOT" && cargo check -p screenpipe-recall -p screenpipe-db -p screenpipe-engine)

echo ""
echo "Done. Next:"
echo "  - Reload VS Code/Cursor window if Tailwind warnings persist"
echo "  - Proactive recall pipeline: docs/proactive-recall/prompts/00-START.md"
echo "  - Run Screenpipe: see PROACTIVE_RECALL.md"
