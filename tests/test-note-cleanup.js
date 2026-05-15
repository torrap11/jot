'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { normalizeNoteTextForDedup, sortCleanupPlan } = require('../noteCleanup');

test('normalizeNoteTextForDedup collapses case and whitespace', () => {
  assert.equal(normalizeNoteTextForDedup('  Hello   World  '), 'hello world');
  assert.equal(normalizeNoteTextForDedup('\nA\nB\t'), 'a b');
});

test('sortCleanupPlan orders create then merge then delete then update then move', () => {
  const plan = [
    { op: 'moveNote', noteId: 1, unfiled: true },
    { op: 'createFolder', name: 'X' },
    { op: 'deleteNote', noteId: 9 },
    { op: 'mergeNotes', keeperId: 1, removeIds: [2], mergedText: 'ok' },
    { op: 'updateNoteText', noteId: 3, text: 'hi' },
  ];
  const sorted = sortCleanupPlan(plan);
  assert.deepEqual(
    sorted.map((p) => p.op),
    ['createFolder', 'mergeNotes', 'deleteNote', 'updateNoteText', 'moveNote'],
  );
});
