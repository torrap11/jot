# Jot

**Jot** is an advanced local-first macOS notes app: capture ideas while you work, organize them with AI, and get the right note back at the right time—without an account or cloud sync.

> **Screen engine:** 🚧 Under construction in this release. Notes, folders, AI auto-filing, proactive recall, and **Jot AI** work fully. Continuous screen recording is coming soon.

## What makes Jot different

1. **Proactive recall** — Notes surface in a corner overlay when you switch apps, matched by app links, keywords, and context—not only when you search.
2. **Natural-language remind workflows** — e.g. *"remind me to check deploy when I open Cursor"* creates a note that resurfaces when that app is frontmost.
3. **AI auto-filing** — New notes file into folders on save (optional Anthropic API key). Batch **File Notes** and custom organization prompts.
4. **Jot AI** — Floating assistant (⌘⇧P) that knows the product and can search, move, tag, and reorganize your notes via tools.
5. **System-wide shortcuts** — ⌘⇧J search, ⌘N quick capture, ⌘⇧R manual recall—from any app, tray-less.

## Download (macOS)

**Latest release:** [github.com/parthha12/jot/releases/latest](https://github.com/parthha12/jot/releases/latest)

### Install in 60 seconds

1. Download **`Jot-<version>.dmg`** from the [Releases](https://github.com/parthha12/jot/releases) page.
2. Open the DMG and drag **Jot** into **Applications**.
3. In **Terminal**, remove the quarantine flag (required until we ship a notarized build):

```bash
xattr -cr "/Applications/Jot.app"
```

4. Open **Jot** from Applications.

**Without Terminal:** Right-click **Jot** in Applications → **Open** → **Open**. If macOS still blocks it: **System Settings → Privacy & Security → Open Anyway**.

Full install and troubleshooting: [INSTALL.md](./INSTALL.md)

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘⇧J | Toggle notes window |
| ⌘N | Quick capture |
| ⌘⇧N | Compose in main window |
| ⌘⇧R | Manual recall |
| ⌘⇧P | Open Jot AI |
| Esc / ⌘W | Save and close (capture or editor) |

### Screenshot note

1. Screenshot → copy to clipboard (macOS: ⌃⇧⌘4, drag, release)
2. **⌘N** — open capture
3. **⌘V** — paste image
4. Type a caption
5. **Esc** — save and close

### Pair with Cursor

Jot opens at login by default (hidden until you use a shortcut). Add **Cursor** to **System Settings → General → Login Items** too — both apps ready when your laptop wakes.

## Develop

Monorepo: Electron app at repo root, Rust engine in `engine/`.

```bash
git clone https://github.com/parthha12/jot.git
cd jot
GIT_LFS_SKIP_SMUDGE=1 git lfs pull   # if LFS smudge fails on clone
./scripts/setup-workspace.sh   # npm install + engine deps
./scripts/build-engine.sh      # first time: 5–15 min
./scripts/run-dev.sh           # or: npm start
npm test
npm run preflight              # before release
npm run dist:arm64             # → dist/Jot-<version>.dmg
```

| Path | Role |
|------|------|
| `/` | Jot Electron app (notes, overlay, Jot AI) |
| `engine/` | Screenpipe + proactive recall (Rust, `:3030`) |
| `integration/` | Sidecar manager + API clients |

## Permissions (macOS)

- **Automation** — frontmost app for resurfacing
- **Accessibility** — recommended
- **Screen Recording** — 🚧 engine under construction

Data: `~/Library/Application Support/jot/`
