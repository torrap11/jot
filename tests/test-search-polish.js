'use strict';

// P4 search polish: pure functions extracted here for testing.
// renderer.js has these inlined, so we duplicate to test without Electron.

const { test } = require('node:test');
const assert = require('node:assert/strict');

function extractSnippet(text, query) {
  const body = String(text || '');
  if (!query) return body.split('\n')[0].slice(0, 120);
  const lower = body.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return body.split('\n')[0].slice(0, 120);
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + query.length + 80);
  const snippet = body.slice(start, end);
  return (start > 0 ? '…' : '') + snippet + (end < body.length ? '…' : '');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightSnippet(snippetText, query) {
  const safe = escapeHtml(snippetText);
  if (!query) return safe;
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(escapedQuery, 'gi'), (m) => `<mark class="search-hl">${m}</mark>`);
}

// ── extractSnippet ────────────────────────────────────────────────────────────

test('extractSnippet: returns first line when no query', () => {
  const text = 'First line\nSecond line\nThird line';
  assert.equal(extractSnippet(text, ''), 'First line');
});

test('extractSnippet: returns context around match', () => {
  const text = 'Intro text. The critical word appears here. More context after it.';
  const snippet = extractSnippet(text, 'critical word');
  assert.ok(snippet.includes('critical word'));
});

test('extractSnippet: adds ellipsis when match is not at start', () => {
  const prefix = 'x'.repeat(50);
  const text = prefix + ' found_it here';
  const snippet = extractSnippet(text, 'found_it');
  assert.ok(snippet.startsWith('…'));
  assert.ok(snippet.includes('found_it'));
});

test('extractSnippet: adds trailing ellipsis when match is not at end', () => {
  const suffix = 'y'.repeat(100);
  const text = 'found_it ' + suffix;
  const snippet = extractSnippet(text, 'found_it');
  assert.ok(snippet.endsWith('…'));
});

test('extractSnippet: falls back to first line when query not found', () => {
  const text = 'Only first line content\nSecond line';
  const snippet = extractSnippet(text, 'nonexistent_xyz');
  assert.equal(snippet, 'Only first line content');
});

test('extractSnippet: case-insensitive match', () => {
  const text = 'Some text with UPPERCASE match here';
  const snippet = extractSnippet(text, 'uppercase match');
  assert.ok(snippet.includes('UPPERCASE match'));
});

test('extractSnippet: handles empty text', () => {
  assert.equal(extractSnippet('', 'query'), '');
});

// ── highlightSnippet ──────────────────────────────────────────────────────────

test('highlightSnippet: wraps match in mark tag', () => {
  const result = highlightSnippet('hello world', 'world');
  assert.ok(result.includes('<mark class="search-hl">world</mark>'));
});

test('highlightSnippet: case-insensitive highlight', () => {
  const result = highlightSnippet('Hello World', 'hello');
  assert.ok(result.includes('<mark class="search-hl">Hello</mark>'));
});

test('highlightSnippet: highlights all occurrences', () => {
  const result = highlightSnippet('cat and cat', 'cat');
  const count = (result.match(/<mark/g) || []).length;
  assert.equal(count, 2);
});

test('highlightSnippet: returns escaped HTML when no query', () => {
  const result = highlightSnippet('<script>alert(1)</script>', '');
  assert.ok(result.includes('&lt;script&gt;'));
  assert.ok(!result.includes('<script>'));
});

test('highlightSnippet: escapes HTML in snippet before highlighting', () => {
  const result = highlightSnippet('<b>bold</b> and match', 'match');
  assert.ok(result.includes('&lt;b&gt;'));
  assert.ok(result.includes('<mark class="search-hl">match</mark>'));
});

test('highlightSnippet: handles empty query', () => {
  const result = highlightSnippet('plain text', '');
  assert.equal(result, 'plain text');
});
