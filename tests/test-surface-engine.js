'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { pickSurfacedNotes, resolveAppKey } = require('../surfaceEngine');
const { KNOWN_APPS } = require('../knownApps');

function mockDb(overrides = {}) {
  return {
    getNotesLinkedToApp: () => [],
    getKeywordCandidates: () => [],
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
