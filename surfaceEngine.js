'use strict';

/** Chooses notes to surface for a frontmost app: explicit links + keyword matches + analytics scoring. */

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

function getTimeOfDayBonus(note) {
  const hour = new Date().getHours();
  const text = (note.text || '').toLowerCase();
  const isMorning = hour >= 5 && hour < 12;
  const isEvening = hour >= 18 && hour < 24;
  const planningKeywords = ['todo', 'plan', 'goal', 'today', 'this week', 'meeting', 'tomorrow'];
  const reviewKeywords = ['review', 'done', 'shipped', 'metrics', 'retro', 'completed', 'recap'];
  if (isMorning && planningKeywords.some((k) => text.includes(k))) return 0.3;
  if (isEvening && reviewKeywords.some((k) => text.includes(k))) return 0.3;
  return 0;
}

function getRecencyBonus(note) {
  const created = new Date(note.created_at).getTime();
  const ageDays = (Date.now() - created) / 86400000;
  if (ageDays < 1) return 0.4;
  if (ageDays < 7) return 0.2;
  if (ageDays < 30) return 0.1;
  return 0;
}

function pickSurfacedNotes({ bundleId, appName, db, catalog, limit = 3, recentTransitions = [] }) {
  const appKey = resolveAppKey(bundleId, appName);
  if (!appKey) return { appKey: '', notes: [] };

  const linked = db.getNotesLinkedToApp(appKey, 80).map((n) => ({ ...n, sourceRank: 2, _whySrc: 'same_app' }));
  const keywordAliases = aliasesForApp(appKey, catalog);
  const keywordMatches = db.getKeywordCandidates(keywordAliases, 80).map((n) => ({ ...n, sourceRank: 1, _whySrc: 'keyword_match' }));

  const merged = new Map();
  [...linked, ...keywordMatches].forEach((note) => {
    const existing = merged.get(note.id);
    if (!existing || note.sourceRank > existing.sourceRank) merged.set(note.id, note);
  });

  // Multi-app transition boost: notes linked to recently visited apps score higher
  const transitionSet = new Set((recentTransitions || []).filter(Boolean));

  const filtered = [...merged.values()]
    .filter((note) => db.canSurfaceNote(note.id, appKey))
    .map((note) => {
      const analyticsBonus = db.getNoteSurfaceScore(note.id, appKey);
      const timeBonus = getTimeOfDayBonus(note);
      const recencyBonus = getRecencyBonus(note);

      // Transition bonus: note linked to any recently visited app
      let transitionBonus = 0;
      if (transitionSet.size > 0) {
        const noteLinks = typeof db.getLinksForNote === 'function' ? db.getLinksForNote(note.id) : [];
        if (noteLinks.some((k) => transitionSet.has(k))) transitionBonus = 0.2;
      }

      // Build whyNow activity tags
      const whyNow = [note._whySrc];
      if (timeBonus > 0) whyNow.push('time_of_day');
      if (recencyBonus >= 0.4) whyNow.push('recency');
      if (transitionBonus > 0) whyNow.push('recent_transition');

      const totalScore = note.sourceRank + analyticsBonus + timeBonus + recencyBonus + transitionBonus;
      return { ...note, _totalScore: totalScore, whyNow };
    })
    .sort((a, b) => b._totalScore - a._totalScore)
    .slice(0, limit);

  for (const note of filtered) {
    db.recordSurfaced(note.id, appKey);
  }
  return { appKey, notes: filtered };
}

module.exports = { resolveAppKey, pickSurfacedNotes };
