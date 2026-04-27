'use strict';

/** Chooses notes to surface for a frontmost app: explicit links + keyword matches on note text. */

const { APP_NAME_TO_BUNDLE_ID } = require('./knownApps');
const { aliasesForApp } = require('./noteAppScan');

function resolveAppKey(bundleId, appName) {
  if (bundleId) return bundleId;
  if (appName && APP_NAME_TO_BUNDLE_ID[appName]) return APP_NAME_TO_BUNDLE_ID[appName];
  if (appName) {
    const lower = appName.toLowerCase();
    for (const [name, id] of Object.entries(APP_NAME_TO_BUNDLE_ID)) {
      if (name.toLowerCase() === lower) return id;
    }
  }
  return '';
}

function pickSurfacedNotes({ bundleId, appName, db, catalog, limit = 3 }) {
  const appKey = resolveAppKey(bundleId, appName);
  if (!appKey) return { appKey: '', notes: [] };

  const linked = db.getNotesLinkedToApp(appKey, 80).map((n) => ({ ...n, sourceRank: 2 }));
  const keywordAliases = aliasesForApp(appKey, catalog);
  const keywordMatches = db.getKeywordCandidates(keywordAliases, 80).map((n) => ({ ...n, sourceRank: 1 }));

  const merged = new Map();
  [...linked, ...keywordMatches].forEach((note) => {
    const existing = merged.get(note.id);
    if (!existing || note.sourceRank > existing.sourceRank) merged.set(note.id, note);
  });

  const filtered = [...merged.values()]
    .filter((note) => db.canSurfaceNote(note.id, appKey))
    .sort((a, b) => {
      if (b.sourceRank !== a.sourceRank) return b.sourceRank - a.sourceRank;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);

  for (const note of filtered) {
    db.recordSurfaced(note.id, appKey);
  }
  return { appKey, notes: filtered };
}

module.exports = { resolveAppKey, pickSurfacedNotes };
