'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseRemindWorkflowText } = require('../remindWorkflowParser');

test('parses basic reminder workflow', () => {
  const out = parseRemindWorkflowText('remind me this: pay rent when i open this Safari');
  assert.deepEqual(out, { reminderText: 'pay rent', appQuery: 'Safari' });
});

test('parses case-insensitively', () => {
  const out = parseRemindWorkflowText('Remind Me This: submit report When I Open This slack.');
  assert.equal(out.reminderText, 'submit report');
  assert.equal(out.appQuery, 'slack');
});

test('does not match without an app target', () => {
  const out = parseRemindWorkflowText('remind me this: pay rent when i open');
  assert.equal(out, null);
});

test('trims trailing punctuation on app target', () => {
  const out = parseRemindWorkflowText('remind me this: check email when i open this Mail,');
  assert.deepEqual(out, { reminderText: 'check email', appQuery: 'Mail' });
});

test('does not match unrelated text', () => {
  const out = parseRemindWorkflowText('remind me later: pay rent');
  assert.equal(out, null);
});

