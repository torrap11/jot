'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyNoteInstructionsPlan } = require('../aiOrganize');

test('applyNoteInstructionsPlan: createNote splits content', () => {
  const created = [];
  const mockDb = {
    listRecent: () => [{ id: 1, text: 'source' }],
    listFolders: () => [],
    createFolder: () => null,
    createNote: (text) => {
      const note = { id: 10 + created.length, text, folder_id: null };
      created.push(note);
      return note;
    },
    setNoteFolder: () => {},
    updateNote: () => {},
    linkNoteToApp: () => {},
    setResurfaceAt: () => {},
  };

  const { applied, errors } = applyNoteInstructionsPlan(mockDb, [
    { op: 'createNote', text: 'Idea A' },
    { op: 'createNote', text: 'Idea B' },
  ]);
  assert.equal(errors.length, 0);
  assert.equal(created.length, 2);
  assert.equal(applied.filter((a) => a.op === 'createNote').length, 2);
});

test('applyNoteInstructionsPlan: linkApp on existing note', () => {
  const links = [];
  const mockDb = {
    listRecent: () => [{ id: 5, text: 'keep me' }],
    listFolders: () => [],
    createFolder: () => null,
    createNote: () => null,
    setNoteFolder: () => {},
    updateNote: () => {},
    linkNoteToApp: (noteId, appKey) => links.push({ noteId, appKey }),
    setResurfaceAt: () => {},
  };

  const { applied, errors } = applyNoteInstructionsPlan(mockDb, [
    { op: 'linkApp', noteId: 5, appQuery: 'Cursor' },
  ]);
  assert.equal(errors.length, 0);
  assert.equal(links.length, 1);
  assert.equal(applied[0].op, 'linkApp');
});
