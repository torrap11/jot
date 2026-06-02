# Run Claude Code without permission spam

Claude Code asks before **Bash** and some **Edits** unless you pre-approve or use bypass mode. That is separate from **macOS** Screen Recording / Automation prompts (only you can fix those in System Settings).

## Recommended: start from workspace root

```bash
cd /Users/parthharish/Documents/github-real/screenpipe-x-jot
claude --dangerously-skip-permissions
```

Then paste `docs/claude-code/00-START.md` or your build prompt.

`--dangerously-skip-permissions` = no tool approval dialogs for the session. Still avoids `rm -rf /` style circuit breakers.

## Already configured in this repo

| File | Effect |
|------|--------|
| `.claude/settings.json` | `acceptEdits` + allow `cargo`, `npm`, `bun`, `git`, `curl`, … |
| `.claude/settings.local.json` | **`bypassPermissions`** for this folder (personal; add to gitignore if you commit a parent repo) |
| `CLAUDE.md` | Tells Claude not to ask you to click Allow for routine dev commands |

If you run `claude` from **`engine/`** only, copy the same `.claude/` block there or use:

```bash
cd screenpipe-x-jot
claude --add-dir engine --add-dir jot --dangerously-skip-permissions
```

## Inside a session

- Type **`/permissions`** → see what is allowed; add rules if something still prompts.
- **`Shift+Tab`** (or permission mode picker) → switch to **auto** or **bypass** if your build supports it.

## Global default (all projects)

Edit `~/.claude/settings.local.json`:

```json
{
  "defaultMode": "bypassPermissions"
}
```

Only do this if you accept the risk on every repo.

## Cursor IDE (if you use Agent there instead)

**Cursor Settings → Features → Agent → Auto-run** (formerly “YOLO”): enable so terminal commands run without per-command approval.

## What Claude cannot automate

- macOS **Screen Recording**, **Microphone**, **Accessibility** for Screenpipe
- **Automation** (System Events) for Jot frontmost-app
- Apple **notarization** / Developer ID signing

Document these in `manual-qa.md`; do not block the build loop waiting for the user to approve `cargo test`.
