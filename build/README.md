Place release assets for packaging here.

- `icon.icns` is expected by electron-builder (`build.icon` in `package.json`).
- Keep `entitlements.mac.plist` in this folder for hardened runtime signing.

If `icon.icns` is missing, `electron-builder` will fallback to the default Electron icon.
