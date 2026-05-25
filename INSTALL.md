# Install Jot on macOS

Jot is a local-first macOS app: notes, AI-powered organization, proactive resurfacing, and the Jot AI agent. No account, no telemetry.

> **Note:** Jot is not yet notarized with an Apple Developer ID. macOS will flag the app as unverified. Use the terminal command below to bypass this until we ship a notarized build.

---

## 60-second install

1. Download `Jot-2.2.0.dmg` from the [latest release](https://github.com/parthha12/jot/releases/latest).
2. Open the `.dmg` and drag **Jot** into **Applications**.
3. In Terminal:

   ```bash
   xattr -cr "/Applications/Jot.app"
   ```

4. Open **Jot** from Applications.

---

## No-Terminal install

1. Download the `.dmg`, drag **Jot** to Applications.
2. Right-click **Jot** → **Open** → **Open**.
3. If blocked: **System Settings → Privacy & Security → Open Anyway**.

---

## Permissions (first launch)

- **Automation** — frontmost app for note resurfacing
- **Accessibility** — recommended
- **Screen Recording** — 🚧 under construction (not required for current release)

---

## Troubleshooting

**"Damaged and can't be opened"**

```bash
xattr -cr "/Applications/Jot.app"
```

This is expected until we ship a notarized build with an Apple Developer ID. The command strips the macOS quarantine flag so the app can open normally.

**Data location**

`~/Library/Application Support/jot/` (notes SQLite)

**Uninstall**

Trash Jot.app; optional: `rm -rf ~/Library/Application\ Support/jot`

---

Source: [github.com/parthha12/jot](https://github.com/parthha12/jot)
