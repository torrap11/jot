'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { executeCaptureWorkflow, applyRemindWorkflowToNote } = require('../captureWorkflow');

test('executeCaptureWorkflow parses remind shorthand without AI', async () => {
  const links = [];
  const mockDb = {
    createNote: (text) => ({ id: 99, text, folder_id: null }),
    linkNoteToApp: (noteId, appKey) => {
      links.push({ noteId, appKey });
    },
  };

  const result = await executeCaptureWorkflow(
    mockDb,
    'remind me to run tests when i open Cursor',
    '/tmp/no-ai-userdata'
  );
  assert.equal(result.ok, true);
  assert.equal(result.reminderText, 'run tests');
  assert.ok(result.appKey);
  assert.equal(result.note.id, 99);
  assert.deepEqual(links, [{ noteId: 99, appKey: result.appKey }]);
});

test('applyRemindWorkflowToNote updates existing note and links app', async () => {
  const links = [];
  let noteText = 'remind me to run tests when i open Cursor';
  const mockDb = {
    updateNote: (_id, text) => {
      noteText = text;
      return { id: 42, text };
    },
    getNote: (id) => ({ id, text: noteText }),
    linkNoteToApp: (noteId, appKey) => {
      links.push({ noteId, appKey });
    },
  };

  const result = await applyRemindWorkflowToNote(
    mockDb,
    42,
    'remind me to run tests when i open Cursor',
    '/tmp/no-ai-userdata'
  );
  assert.equal(result.ok, true);
  assert.equal(result.reminderText, 'run tests');
  assert.equal(noteText, 'run tests');
  assert.deepEqual(links, [{ noteId: 42, appKey: result.appKey }]);
});

test('applyRemindWorkflowToNote preserveBody keeps note text', async () => {
  const links = [];
  let noteText = 'Philosophy of spectrums and control';
  const mockDb = {
    updateNote: (_id, text) => {
      noteText = text;
      return { id: 42, text };
    },
    getNote: (id) => ({ id, text: noteText }),
    linkNoteToApp: (noteId, appKey) => {
      links.push({ noteId, appKey });
    },
  };

  const result = await applyRemindWorkflowToNote(
    mockDb,
    42,
    'remind me to review this when i open Cursor',
    '/tmp/no-ai-userdata',
    { preserveBody: true }
  );
  assert.equal(result.ok, true);
  assert.equal(noteText, 'Philosophy of spectrums and control');
  assert.equal(links.length, 1);
});
