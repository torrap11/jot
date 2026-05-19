# Upstream Screenpipe layout (this repo)

Merged from [screenpipe/screenpipe](https://github.com/screenpipe/screenpipe) `main` into `parthha12/proactive-recall`.

## Renames vs older research docs

| Research / old prompt | This repo |
|----------------------|-----------|
| `screenpipe-server` | **`screenpipe-engine`** — REST API, routes, `screenpipe` binary |
| (same) | `screenpipe-db`, `screenpipe-events`, `screenpipe-app-tauri` |

Recall HTTP routes belong in **`crates/screenpipe-engine`** (see `src/routes/`).

## Remotes

```bash
git remote -v
# origin              → parthha12/proactive-recall
# screenpipe-upstream → screenpipe/screenpipe
```

## LFS

Upstream uses Git LFS. Clone without smudge if LFS is not installed:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone ...
```

Or: `brew install git-lfs && git lfs install`.
