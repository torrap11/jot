'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseNLTime, parseTimeReminderText, looksLikeTimeReminder } = require('../timeParser');

const NOW = new Date('2026-05-23T10:00:00.000Z');

// ── parseNLTime ──────────────────────────────────────────────────────────────

test('parseNLTime: "in 30 min"', () => {
  const r = parseNLTime('in 30 min', NOW);
  assert.ok(r, 'should return result');
  assert.equal(r.label, 'in 30 minutes');
  const d = new Date(r.iso);
  assert.equal(d.getTime(), NOW.getTime() + 30 * 60_000);
});

test('parseNLTime: "in 1 hour"', () => {
  const r = parseNLTime('in 1 hour', NOW);
  assert.ok(r);
  assert.equal(r.label, 'in 1 hour');
  const d = new Date(r.iso);
  assert.equal(d.getTime(), NOW.getTime() + 3_600_000);
});

test('parseNLTime: "in 2 hours"', () => {
  const r = parseNLTime('in 2 hours', NOW);
  assert.ok(r);
  assert.equal(r.label, 'in 2 hours');
});

test('parseNLTime: "in 1 day"', () => {
  const r = parseNLTime('in 1 day', NOW);
  assert.ok(r);
  assert.equal(r.label, 'in 1 day');
  const d = new Date(r.iso);
  assert.equal(d.getTime(), NOW.getTime() + 86_400_000);
});

test('parseNLTime: "tomorrow morning"', () => {
  const r = parseNLTime('tomorrow morning', NOW);
  assert.ok(r);
  assert.equal(r.label, 'tomorrow morning');
  const d = new Date(r.iso);
  assert.equal(d.getUTCDate(), NOW.getUTCDate() + 1);
});

test('parseNLTime: "tomorrow afternoon"', () => {
  const r = parseNLTime('tomorrow afternoon', NOW);
  assert.ok(r);
  assert.equal(r.label, 'tomorrow afternoon');
});

test('parseNLTime: "tomorrow evening"', () => {
  const r = parseNLTime('tomorrow evening', NOW);
  assert.ok(r);
  assert.equal(r.label, 'tomorrow evening');
});

test('parseNLTime: "tomorrow at 3pm"', () => {
  const r = parseNLTime('tomorrow at 3pm', NOW);
  assert.ok(r);
  assert.match(r.label, /tomorrow at/);
});

test('parseNLTime: "at 3pm" — future', () => {
  const earlyNow = new Date('2026-05-23T08:00:00.000Z');
  const r = parseNLTime('at 3pm', earlyNow);
  assert.ok(r);
  assert.match(r.label, /at 3pm/);
});

test('parseNLTime: "at 3pm" — past rolls to tomorrow', () => {
  const lateNow = new Date('2026-05-23T20:00:00.000Z');
  const r = parseNLTime('at 3pm', lateNow);
  assert.ok(r);
  const d = new Date(r.iso);
  assert.ok(d > lateNow, 'should be in the future');
});

test('parseNLTime: "tonight"', () => {
  const r = parseNLTime('tonight', NOW);
  assert.ok(r);
  assert.equal(r.label, 'tonight');
});

test('parseNLTime: "this evening"', () => {
  const r = parseNLTime('this evening', NOW);
  assert.ok(r);
  assert.equal(r.label, 'this evening');
});

test('parseNLTime: "this afternoon"', () => {
  const r = parseNLTime('this afternoon', NOW);
  assert.ok(r);
  assert.equal(r.label, 'this afternoon');
});

test('parseNLTime: null on unknown', () => {
  assert.equal(parseNLTime('when I open Cursor', NOW), null);
  assert.equal(parseNLTime('', NOW), null);
  assert.equal(parseNLTime('review the doc', NOW), null);
});

// ── parseTimeReminderText ────────────────────────────────────────────────────

test('parseTimeReminderText: "remind me to review PR in 30 min"', () => {
  const r = parseTimeReminderText('remind me to review PR in 30 min', NOW);
  assert.ok(r);
  assert.equal(r.reminderText, 'review PR');
  assert.equal(r.label, 'in 30 minutes');
  assert.ok(r.resurface_at);
});

test('parseTimeReminderText: "remind me to check deploy in 2 hours"', () => {
  const r = parseTimeReminderText('remind me to check deploy in 2 hours', NOW);
  assert.ok(r);
  assert.equal(r.reminderText, 'check deploy');
  assert.equal(r.label, 'in 2 hours');
});

test('parseTimeReminderText: "remind me to call Bob tomorrow"', () => {
  const r = parseTimeReminderText('remind me to call Bob tomorrow', NOW);
  assert.ok(r);
  assert.equal(r.reminderText, 'call Bob');
  assert.match(r.label, /tomorrow/);
});

test('parseTimeReminderText: "remind me at 3pm to send report"', () => {
  const earlyNow = new Date('2026-05-23T08:00:00.000Z');
  const r = parseTimeReminderText('remind me at 3pm to send report', earlyNow);
  assert.ok(r);
  assert.equal(r.reminderText, 'send report');
  assert.match(r.label, /3pm/);
});

test('parseTimeReminderText: "remind me in 1 hour to check logs"', () => {
  const r = parseTimeReminderText('remind me in 1 hour to check logs', NOW);
  assert.ok(r);
  assert.equal(r.reminderText, 'check logs');
  assert.equal(r.label, 'in 1 hour');
});

test('parseTimeReminderText: null on plain app-open reminder', () => {
  const r = parseTimeReminderText('remind me to review PR when I open Cursor', NOW);
  assert.equal(r, null);
});

test('parseTimeReminderText: null on plain text', () => {
  const r = parseTimeReminderText('write a note about the meeting', NOW);
  assert.equal(r, null);
});

test('parseTimeReminderText: null on empty', () => {
  assert.equal(parseTimeReminderText('', NOW), null);
  assert.equal(parseTimeReminderText(null, NOW), null);
});

// ── looksLikeTimeReminder ────────────────────────────────────────────────────

test('looksLikeTimeReminder: detects in-N-min pattern', () => {
  assert.ok(looksLikeTimeReminder('remind me to check PR in 30 min'));
  assert.ok(looksLikeTimeReminder('remind me in 1 hour to call Bob'));
});

test('looksLikeTimeReminder: detects at-time pattern', () => {
  assert.ok(looksLikeTimeReminder('remind me to send email at 3pm'));
});

test('looksLikeTimeReminder: detects tomorrow', () => {
  assert.ok(looksLikeTimeReminder('remind me to review doc tomorrow'));
});

test('looksLikeTimeReminder: false on app-open pattern', () => {
  assert.ok(!looksLikeTimeReminder('remind me to check PR when I open Cursor'));
});

test('looksLikeTimeReminder: false on plain text', () => {
  assert.ok(!looksLikeTimeReminder('write a note about the meeting'));
  assert.ok(!looksLikeTimeReminder(''));
  assert.ok(!looksLikeTimeReminder(null));
});
