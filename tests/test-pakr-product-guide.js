'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PAKR_PRODUCT_GUIDE, getPakrSystemPrompt } = require('../pakr/pakrProductGuide');

test('product guide includes core shortcuts', () => {
  assert.match(PAKR_PRODUCT_GUIDE, /⌘P/);
  assert.match(PAKR_PRODUCT_GUIDE, /⌘N/);
  assert.match(PAKR_PRODUCT_GUIDE, /⌘⇧R/);
  assert.match(PAKR_PRODUCT_GUIDE, /Recordings/);
  assert.match(PAKR_PRODUCT_GUIDE, /Manual recall/);
});

test('system prompt embeds product guide', () => {
  const prompt = getPakrSystemPrompt();
  assert.match(prompt, /Product guide/);
  assert.match(prompt, /do not invent features/i);
  assert.ok(prompt.includes(PAKR_PRODUCT_GUIDE.slice(0, 80)));
});
