# Install Jot on macOS

**Jot** is a local-first macOS notes app with AI organization, proactive recall, and **Jot AI**. No account, no telemetry.

> **Notarization:** This build is not yet signed with an Apple Developer ID. macOS may say the app is from an unidentified developer. Use the Terminal step below (or right-click → Open).

---

## 60-second install

1. Download the latest **`Jot-<version>.dmg`** from  
   **[github.com/parthha12/jot/releases/latest](https://github.com/parthha12/jot/releases/latest)**

2. Open the `.dmg` and drag **Jot** into **Applications**.

3. In **Terminal**, run (required until notarized builds ship):

```bash
xattr -cr "/Applications/Jot.app"
```

4. Open **Jot** from Applications.

---

## Install without Terminal

1. Download the `.dmg`, drag **Jot** to Applications.
2. **Right-click** Jot → **Open** → **Open** (do not double-click the first time).
3. If still blocked: **System Settings → Privacy & Security → Open Anyway**.

---

## First launch permissions

| Permission | Why |
|------------|-----|
| **Automation** | Detect frontmost app for note resurfacing |
| **Accessibility** | Recommended for richer context |
| **Screen Recording** | 🚧 Under construction—not required for this release |

Optional: **File → Anthropic API Key…** for Jot AI, auto-filing, and batch organize.

---

## Troubleshooting

**"Jot is damaged and can't be opened"** or **"can't be opened because Apple cannot check it"**

```bash
xattr -cr "/Applications/Jot.app"
```

This clears the download quarantine flag. It is normal for unsigned developer builds.

**Data location**

`~/Library/Application Support/jot/` (SQLite notes database)

**Uninstall**

Move **Jot.app** to Trash. Optional: `rm -rf ~/Library/Application\ Support/jot`

---

[Releases](https://github.com/parthha12/jot/releases) · [README](README.md)
