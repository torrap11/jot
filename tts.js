'use strict';

/**
 * tts.js – Smallest AI Lightning Text-to-Speech.
 *
 * Calls the Lightning v3.1 non-streaming endpoint and returns a WAV Buffer
 * ready to be transferred to the renderer for playback via Web Audio API.
 *
 * If SMALLEST_AI_KEY is not configured, all functions resolve silently so
 * TTS is an optional enhancement, not a hard dependency.
 *
 * API reference: https://waves-docs.smallest.ai/
 */

const { getConfig } = require('./config');

const TTS_ENDPOINT = 'https://api.smallest.ai/waves/v1/lightning-v3.1/get_speech';
const TTS_TIMEOUT_MS = 10_000;

/**
 * Synthesize text using Smallest AI Lightning.
 * Returns a WAV Buffer, or null if TTS is not configured.
 *
 * @param {string} text
 * @returns {Promise<Buffer|null>}
 */
async function synthesize(text) {
  if (!text || !text.trim()) return null;

  const cfg = getConfig();
  if (!cfg.smallestAiKey) return null; // TTS is optional — skip gracefully

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.smallestAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim().slice(0, 400), // keep latency low
        voice_id:     cfg.ttsVoice,
        speed:        1.0,
        sample_rate:  cfg.ttsSampleRate,
        language:     cfg.sttLanguage,
        output_format: 'wav',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Lightning TTS ${response.status}: ${body.slice(0, 120)}`);
    }

    const arrayBuf = await response.arrayBuffer();
    return Buffer.from(arrayBuf);
  } finally {
    clearTimeout(timeout);
  }
}

// ── Confirmation phrase builders ─────────────────────────────────────────────

const TRIGGER_CONTEXT = {
  netflix_open:  'Netflix',
  linkedin_open: 'LinkedIn',
  gmail_open:    'Gmail',
  work_start:    'work',
  general:       null,
};

/**
 * Build a natural spoken confirmation for a just-saved intent memory.
 * @param {{ trigger: string, content: string }} intent
 * @returns {string}
 */
function buildSaveConfirmation(intent) {
  const ctx = TRIGGER_CONTEXT[intent.trigger];
  if (ctx) {
    return `Got it. I'll remind you to ${intent.content} next time you open ${ctx}.`;
  }
  return `Saved. I'll remember: ${intent.content}.`;
}

/**
 * Build a spoken read-out when a context trigger fires.
 * @param {string} triggerLabel  e.g. "Netflix"
 * @param {Array<{content: string}>} memories
 * @returns {string|null}
 */
function buildTriggerReadout(triggerLabel, memories) {
  if (!memories || memories.length === 0) return null;
  const first = memories[0].content;
  if (memories.length === 1) {
    return `${triggerLabel} reminder: ${first}.`;
  }
  return `${triggerLabel} reminder: ${first}. Plus ${memories.length - 1} more.`;
}

/**
 * Synthesize and return a save confirmation phrase.
 * Returns null silently if TTS not configured.
 */
async function speakSaveConfirmation(intent) {
  const phrase = buildSaveConfirmation(intent);
  return synthesize(phrase);
}

/**
 * Synthesize and return a trigger read-out.
 * Returns null silently if TTS not configured or no memories.
 */
async function speakTriggerReadout(triggerLabel, memories) {
  const phrase = buildTriggerReadout(triggerLabel, memories);
  if (!phrase) return null;
  return synthesize(phrase);
}

module.exports = {
  synthesize,
  speakSaveConfirmation,
  speakTriggerReadout,
  buildSaveConfirmation,
  buildTriggerReadout,
};
