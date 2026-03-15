'use strict';

/**
 * voice.js – Speech-to-text transcription (main process only).
 *
 * Provider priority:
 *   1. Smallest AI Pulse  – if SMALLEST_AI_KEY is set
 *      Advantages: word timestamps, emotion detection, 32+ languages
 *      Docs: https://waves-docs.smallest.ai/
 *
 *   2. OpenAI Whisper     – fallback if EASY_JOT_OPENAI_API_KEY is set
 *
 * Both providers accept the raw audio Buffer produced by the renderer's
 * MediaRecorder (WebM/Opus format). The result is always a plain string.
 */

const { OpenAI, toFile } = require('openai');
const { app } = require('electron');
const fs   = require('fs');
const path = require('path');
const { getConfig } = require('./config');

// Smallest AI Pulse STT endpoint
const PULSE_ENDPOINT = 'https://waves-api.smallest.ai/api/v1/pulse/get_text';
const STT_TIMEOUT_MS = 30_000;

// ── Provider: Smallest AI Pulse ──────────────────────────────────────────────

/**
 * Transcribe audio using Smallest AI Pulse.
 * Returns { transcript, words } where words is an array of timed tokens.
 *
 * @param {Buffer} audioBuffer  – WebM/Opus audio from MediaRecorder
 * @param {string} apiKey
 * @param {string} language     – BCP-47 code, e.g. "en"
 * @returns {Promise<{ transcript: string, words: Array }>}
 */
async function transcribeWithPulse(audioBuffer, apiKey, language = 'en') {
  const params = new URLSearchParams({
    language,
    word_timestamps: 'true',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);

  try {
    const response = await fetch(`${PULSE_ENDPOINT}?${params}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'audio/webm',
      },
      body: audioBuffer,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Pulse STT ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json();

    if (data.status && data.status !== 'success') {
      throw new Error(`Pulse STT failed: ${data.message || JSON.stringify(data)}`);
    }

    return {
      transcript: (data.transcription || '').trim(),
      words:      data.words || [],
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Provider: OpenAI Whisper ─────────────────────────────────────────────────

/**
 * Transcribe audio using OpenAI Whisper-1.
 *
 * @param {Buffer} audioBuffer
 * @param {string} apiKey
 * @returns {Promise<{ transcript: string, words: Array }>}
 */
async function transcribeWithWhisper(audioBuffer, apiKey) {
  const tmpPath = path.join(
    app.getPath('temp'),
    `jot-voice-${process.hrtime.bigint()}.webm`
  );
  fs.writeFileSync(tmpPath, audioBuffer);

  try {
    const client = new OpenAI({ apiKey });
    const file   = await toFile(
      fs.createReadStream(tmpPath),
      'recording.webm',
      { type: 'audio/webm' }
    );
    const result = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });
    return { transcript: (result.text || '').trim(), words: [] };
  } finally {
    try { fs.unlinkSync(tmpPath); } catch (_) { /* best-effort cleanup */ }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Transcribe a raw audio Buffer, trying Pulse then Whisper.
 *
 * Returns { transcript, words, provider } where provider is the name used.
 * Throws only if neither provider is configured or both fail.
 *
 * @param {Buffer} audioBuffer
 * @returns {Promise<{ transcript: string, words: Array, provider: string }>}
 */
async function transcribeAudio(audioBuffer) {
  const cfg = getConfig();

  // Provider 1: Smallest AI Pulse
  if (cfg.smallestAiKey) {
    try {
      const { transcript, words } = await transcribeWithPulse(
        audioBuffer, cfg.smallestAiKey, cfg.sttLanguage
      );
      return { transcript, words, provider: 'pulse' };
    } catch (err) {
      console.warn('[voice] Pulse STT failed, falling back to Whisper:', err.message);
      // Fall through to Whisper
    }
  }

  // Provider 2: OpenAI Whisper
  if (cfg.openaiApiKey) {
    const { transcript, words } = await transcribeWithWhisper(audioBuffer, cfg.openaiApiKey);
    return { transcript, words, provider: 'whisper' };
  }

  throw new Error(
    'No STT provider configured.\n' +
    'Set SMALLEST_AI_KEY for Smallest AI Pulse (recommended), or\n' +
    'EASY_JOT_OPENAI_API_KEY for OpenAI Whisper.\n' +
    'Add either key to your config.json.'
  );
}

module.exports = { transcribeAudio };
