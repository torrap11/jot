'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { detectBundleIdsFromText, normalise } = require('../noteAppScan');
const { KNOWN_APPS } = require('../knownApps');

function detect(title, body) {
  const text = [title, body].filter(Boolean).join('\n');
  return detectBundleIdsFromText(text, KNOWN_APPS);
}

// ── normalise() ───────────────────────────────────────────────────────────────

test('normalise: lowercases and collapses punctuation', () => {
  assert.equal(normalise('Hello, World!'), 'hello world');
  assert.equal(normalise('text—message'), 'text message');
  assert.equal(normalise('foo  bar'), 'foo bar');
});

test('normalise: empty/null input', () => {
  assert.equal(normalise(''), '');
  assert.equal(normalise(null), '');
  assert.equal(normalise(undefined), '');
});

// ── detectBundleIdsFromText() ─────────────────────────────────────────────────

test('detects Slack from note content', () => {
  const ids = detect('Team meeting', 'Discuss on Slack with the team');
  assert.ok(ids.has('com.tinyspeck.slackmacgap'));
});

test('detects WhatsApp from title', () => {
  const ids = detect('WhatsApp follow-up', '');
  assert.ok(ids.has('net.whatsapp.WhatsApp'));
});

test('detects Messages from "iMessage" alias', () => {
  const ids = detect('', 'Send via iMessage tonight');
  assert.ok(ids.has('com.apple.MobileSMS'));
});

test('detects Messages from "sms" alias', () => {
  const ids = detect('', 'I will send an SMS to confirm');
  assert.ok(ids.has('com.apple.MobileSMS'));
});

test('detects App Store from "app store" alias', () => {
  const ids = detect('', 'download from the app store');
  assert.ok(ids.has('com.apple.AppStore'));
});

test('detects Zoom from "zoom call"', () => {
  const ids = detect('', 'Prepare for the zoom call at 3pm');
  assert.ok(ids.has('us.zoom.xos'));
});

test('detects Zoom from standalone "zoom"', () => {
  const ids = detect('', 'Join zoom at noon');
  assert.ok(ids.has('us.zoom.xos'));
});

test('detects multiple apps in one note', () => {
  const ids = detect('', 'Send WhatsApp and also message on Slack');
  assert.ok(ids.has('net.whatsapp.WhatsApp'));
  assert.ok(ids.has('com.tinyspeck.slackmacgap'));
});

// ── False-positive guards ─────────────────────────────────────────────────────

test('does not detect partial-word match for "sms" inside "plasma"', () => {
  const ids = detect('', 'This is plasma physics');
  assert.ok(!ids.has('com.apple.MobileSMS'));
});

test('does not match "slack" inside "slacker"', () => {
  const ids = detect('', 'He was a total slacker');
  assert.ok(!ids.has('com.tinyspeck.slackmacgap'));
});

test('empty text returns empty set', () => {
  const ids = detect('', '');
  assert.equal(ids.size, 0);
});

test('unrelated text returns empty set', () => {
  const ids = detect('Grocery list', 'eggs milk bread butter flour');
  assert.equal(ids.size, 0);
});

test('calling detect twice on same text returns same result', () => {
  const a = detect('Discuss on Slack', 'with the team');
  const b = detect('Discuss on Slack', 'with the team');
  assert.deepEqual([...a].sort(), [...b].sort());
});

// ── Catalog contract ──────────────────────────────────────────────────────────

test('all catalog entries have required fields', () => {
  for (const app of KNOWN_APPS) {
    assert.ok(app.name, `missing name in ${JSON.stringify(app)}`);
    assert.ok(app.bundleId, `missing bundleId in ${JSON.stringify(app)}`);
    assert.ok(
      Array.isArray(app.aliases) && app.aliases.length > 0,
      `missing aliases in ${app.name}`
    );
  }
});
