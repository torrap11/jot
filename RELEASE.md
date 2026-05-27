# Jot releases

Canonical repo: **[github.com/parthha12/jot](https://github.com/parthha12/jot)**  
Latest download: **[Releases → Latest](https://github.com/parthha12/jot/releases/latest)**

## Build

```bash
npm run preflight
npm run dist:arm64
```

Artifact: `dist/Jot-<version>.dmg`

## Install (users)

See [INSTALL.md](./INSTALL.md). After installing from DMG:

```bash
xattr -cr "/Applications/Jot.app"
```

## Release history

Tags follow semver from v1.0.0 through current. Older tags may reference earlier product names; **v2.2.2+** is fully branded **Jot**.
