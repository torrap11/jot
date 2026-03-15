'use strict';

/**
 * intentParser.js – Extract structured intent from natural language.
 *
 * Uses the existing LLM infrastructure (llm.js) to convert a voice
 * transcript or typed phrase into a structured intent memory object.
 *
 * Trigger IDs and labels are sourced from triggerEngine.js so there's
 * a single source of truth.
 */

const { callLLM } = require('./llm');
const { TRIGGER_LABELS, normalizeTrigger } = require('./triggerEngine');

// Build trigger instructions dynamically from the canonical trigger map
const TRIGGER_EXAMPLES = Object.entries(TRIGGER_LABELS)
  .map(([id, label]) => `  - References to ${label} → "${id}"`)
  .join('\n');

const INTENT_SYSTEM_PROMPT = `You are an intent extraction assistant for a voice-memory app.
Given a natural-language statement, extract the trigger context, the reminder content, and a category.

Respond with ONLY a valid JSON object — no prose, no markdown fences:
{
  "type": "intent_memory",
  "trigger": "<trigger id>",
  "content": "<concise reminder text, max 100 chars>",
  "category": "<category>"
}

Trigger ID rules:
${TRIGGER_EXAMPLES}
  - No specific app/context → "general"

Category options: entertainment, work, relationships, health, learning, finance, other

Rules:
- Return ONLY the raw JSON object
- Keep "content" short and actionable
- If the user says "when I open X" or "remind me when X", extract X as the trigger`;

/**
 * Parse a natural language transcript into structured intent memory.
 *
 * @param {string} transcript
 * @returns {Promise<{type: string, trigger: string, content: string, category: string}>}
 */
async function parseIntent(transcript) {
  let raw;
  try {
    raw = await callLLM(INTENT_SYSTEM_PROMPT, transcript, []);
  } catch (err) {
    console.warn('[intentParser] LLM unavailable, using raw transcript:', err.message);
    return buildFallback(transcript);
  }

  // Try direct JSON parse
  let parsed = tryParseObject(raw.trim());

  // Strip markdown fences and retry
  if (!parsed) {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    parsed = tryParseObject(cleaned);
  }

  // Extract embedded JSON object
  if (!parsed) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = tryParseObject(match[0]);
  }

  if (!parsed) {
    return buildFallback(transcript);
  }

  // Validate trigger against known IDs; normalize if needed
  const trigger = normalizeTrigger(parsed.trigger) || 'general';

  return {
    type:     'intent_memory',
    trigger,
    content:  (parsed.content || transcript).trim().slice(0, 200),
    category: parsed.category || 'other',
  };
}

function buildFallback(transcript) {
  return {
    type:     'intent_memory',
    trigger:  'general',
    content:  transcript.trim().slice(0, 200),
    category: 'other',
  };
}

function tryParseObject(str) {
  try {
    const v = JSON.parse(str);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  } catch (_) {}
  return null;
}

module.exports = { parseIntent };
