'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { pickSurfacedNotes, resolveAppKey } = require('../surfaceEngine');
const { KNOWN_APPS } = require('../knownApps');

function mockDb(overrides = {}) {
  return {
    getNotesLinkedToApp: () => [],
    getKeywordCandidates: () => [],
    getNoteSurfaceScore: () => 0,
    canSurfaceNote: () => true,
    recordSurfaced: () => {},
    ...overrides,
  };
}

test('resolveAppKey: prefers bundle id from OS', () => {
  assert.equal(resolveAppKey('com.spotify.client', 'Anything'), 'com.spotify.client');
});

test('resolveAppKey: maps known display name when bundle id missing', () => {
  assert.equal(resolveAppKey('', 'Spotify'), 'com.spotify.client');
});

test('resolveAppKey: case-insensitive display name', () => {
  assert.equal(resolveAppKey('', 'spotify'), 'com.spotify.client');
});

test('resolveAppKey: unknown name and no bundle → empty', () => {
  assert.equal(resolveAppKey('', 'UnknownApp'), '');
});

test('pickSurfacedNotes: merges linked + keyword hits, dedupes by note id (linked wins)', () => {
  const note = { id: 1, text: 'hello slack', created_at: '2026-01-01' };
  const db = mockDb({
    getNotesLinkedToApp: () => [note],
    getKeywordCandidates: () => [{ ...note, text: 'slack ping' }],
    recordSurfaced: () => {},
  });
  const { notes } = pickSurfacedNotes({
    bundleId: 'com.tinyspeck.slackmacgap',
    appName: 'Slack',
    db,
    catalog: KNOWN_APPS,
    limit: 5,
  });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].id, 1);
});

test('pickSurfacedNotes: respects canSurfaceNote', () => {
  const db = mockDb({
    getNotesLinkedToApp: () => [{ id: 2, text: 'nope', created_at: '2026-01-01' }],
    canSurfaceNote: () => false,
  });
  const { notes } = pickSurfacedNotes({
    bundleId: 'com.spotify.client',
    appName: 'Spotify',
    db,
    catalog: KNOWN_APPS,
    limit: 5,
  });
  assert.equal(notes.length, 0);
});

test('pickSurfacedNotes: empty when app cannot be resolved', () => {
  const db = mockDb();
  const out = pickSurfacedNotes({
    bundleId: '',
    appName: 'TotallyUnknown',
    db,
    catalog: KNOWN_APPS,
    limit: 3,
  });
  assert.equal(out.appKey, '');
  assert.equal(out.notes.length, 0);
});

// ── Activity tags (whyNow) ────────────────────────────────────────────────────

test('pickSurfacedNotes: linked note gets same_app whyNow tag', () => {
  const note = { id: 10, text: 'spotify note', created_at: '2026-01-01' };
  const db = mockDb({ getNotesLinkedToApp: () => [note] });
  const { notes } = pickSurfacedNotes({
    bundleId: 'com.spotify.client',
    appName: 'Spotify',
    db,
    catalog: KNOWN_APPS,
    limit: 3,
  });
  assert.ok(notes.length > 0);
  assert.ok(Array.isArray(notes[0].whyNow), 'whyNow should be an array');
  assert.ok(notes[0].whyNow.includes('same_app'), 'linked note should have same_app tag');
});

test('pickSurfacedNotes: keyword-matched note gets keyword_match whyNow tag', () => {
  const note = { id: 11, text: 'slack meeting notes', created_at: '2026-01-01' };
  const db = mockDb({
    getNotesLinkedToApp: () => [],
    getKeywordCandidates: () => [note],
  });
  const { notes } = pickSurfacedNotes({
    bundleId: 'com.tinyspeck.slackmacgap',
    appName: 'Slack',
    db,
    catalog: KNOWN_APPS,
    limit: 3,
  });
  assert.ok(notes.length > 0);
  assert.ok(notes[0].whyNow.includes('keyword_match'), 'keyword match should have keyword_match tag');
});

test('pickSurfacedNotes: recent note also gets recency whyNow tag', () => {
  const recentDate = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
  const note = { id: 12, text: 'fresh note', created_at: recentDate };
  const db = mockDb({ getNotesLinkedToApp: () => [note] });
  const { notes } = pickSurfacedNotes({
    bundleId: 'com.spotify.client',
    appName: 'Spotify',
    db,
    catalog: KNOWN_APPS,
    limit: 3,
  });
  assert.ok(notes.length > 0);
  assert.ok(notes[0].whyNow.includes('recency'), 'very recent note should have recency tag');
});

test('pickSurfacedNotes: transition bonus fires when note linked to recent app', () => {
  const note = { id: 13, text: 'cross-app note', created_at: '2026-01-01' };
  const db = mockDb({
    getNotesLinkedToApp: () => [note],
    getLinksForNote: () => ['com.prev.app'],
  });
  const { notes } = pickSurfacedNotes({
    bundleId: 'com.spotify.client',
    appName: 'Spotify',
    db,
    catalog: KNOWN_APPS,
    limit: 3,
    recentTransitions: ['com.prev.app'],
  });
  assert.ok(notes.length > 0);
  assert.ok(notes[0].whyNow.includes('recent_transition'), 'should have recent_transition tag when linked to recently visited app');
});
