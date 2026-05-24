# Install PakrAI on macOS

PakrAI is a local-first macOS app: notes, screen recording query, proactive resurfacing, and the Pakr agent. No account, no telemetry.

This build is **ad-hoc signed**, so the first launch may need one extra step. After that it runs normally.

---

## 60-second install

1. Download `PakrAI-2.1.0.dmg` from the [latest release](https://github.com/parthha12/PakrAI/releases/latest).
2. Open the `.dmg` and drag **PakrAI** into **Applications**.
3. In Terminal:

   ```bash
   xattr -dr com.apple.quarantine /Applications/PakrAI.app
   ```

4. Open **PakrAI** from Applications.

---

## No-Terminal install

1. Download the `.dmg`, drag **PakrAI** to Applications.
2. Right-click **PakrAI** → **Open** → **Open**.
3. If blocked: **System Settings → Privacy & Security → Open Anyway**.

---

## Permissions (first launch)

- **Screen Recording** — query your screen history
- **Automation** — frontmost app for note resurfacing
- **Accessibility** — recommended

---

## Troubleshooting

**"Damaged and can't be opened"**

```bash
xattr -dr com.apple.quarantine /Applications/PakrAI.app
```

**Data location**

`~/Library/Application Support/pakrai/` (notes SQLite; dev may use `jot.db` in repo)

**Uninstall**

Trash PakrAI.app; optional: `rm -rf ~/Library/Application\ Support/pakrai`

---

Source: [github.com/parthha12/PakrAI](https://github.com/parthha12/PakrAI) · Docs: [docs/pakrai/README.md](docs/pakrai/README.md)
