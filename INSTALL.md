# Install Pakr Notes on macOS

Pakr Notes is a local-first macOS app: notes, screen recording query, proactive resurfacing, and the Pakr agent. No account, no telemetry.

> **Note:** Pakr Notes is not yet notarized with an Apple Developer ID. macOS will flag the app as unverified. Use the terminal command below to bypass this until we ship a notarized build.

---

## 60-second install

1. Download `PakrNotes-2.2.0.dmg` from the [latest release](https://github.com/parthha12/PakrAI/releases/latest).
2. Open the `.dmg` and drag **Pakr Notes** into **Applications**.
3. In Terminal:

   ```bash
   xattr -cr "/Applications/Pakr Notes.app"
   ```

4. Open **Pakr Notes** from Applications.

---

## No-Terminal install

1. Download the `.dmg`, drag **Pakr Notes** to Applications.
2. Right-click **Pakr Notes** → **Open** → **Open**.
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
xattr -cr "/Applications/Pakr Notes.app"
```

This is expected until we ship a notarized build with an Apple Developer ID. The command strips the macOS quarantine flag so the app can open normally.

**Data location**

`~/Library/Application Support/pakrai/` (notes SQLite; dev may use `jot.db` in repo)

**Uninstall**

Trash Pakr Notes.app; optional: `rm -rf ~/Library/Application\ Support/pakrai`

---

Source: [github.com/parthha12/PakrAI](https://github.com/parthha12/PakrAI) · Docs: [docs/pakrai/README.md](docs/pakrai/README.md)
