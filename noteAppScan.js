'use strict';

function normalise(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const _reCache = new Map();

function getWordBoundaryRe(alias) {
  if (_reCache.has(alias)) return _reCache.get(alias);
  const normalised = normalise(alias);
  // Escape any regex-special chars remaining after normalisation (unlikely but safe).
  const escaped = normalised.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i');
  _reCache.set(alias, re);
  return re;
}

function detectBundleIdsFromText(text, catalog) {
  const combined = normalise(text);
  const found = new Set();

  for (const app of catalog) {
    if (found.has(app.bundleId)) continue; // already matched
    for (const alias of app.aliases) {
      const re = getWordBoundaryRe(alias);
      if (re.test(combined)) {
        found.add(app.bundleId);
        break; // one alias match per app is enough
      }
    }
  }

  return found;
}

function aliasesForApp(appNameOrBundle, catalog) {
  const app = catalog.find(
    (item) =>
      item.bundleId === appNameOrBundle ||
      item.name === appNameOrBundle ||
      item.name.toLowerCase() === String(appNameOrBundle || '').toLowerCase()
  );
  return app ? app.aliases : [];
}

module.exports = { detectBundleIdsFromText, aliasesForApp, normalise };
