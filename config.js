'use strict';

/**
 * config.js – Single source of truth for all runtime configuration.
 *
 * Priority order (highest to lowest):
 *   1. Environment variables
 *   2. userData/config.json
 *   3. Built-in defaults
 *
 * Example config.json:
 * {
 *   "openaiApiKey": "sk-...",
 *   "smallestAiKey": "...",
 *   "model": "gpt-4o-mini",
 *   "useOllama": false,
 *   "ollamaBaseURL": "http://localhost:11434/v1",
 *   "ttsVoice": "emily",
 *   "ttsSampleRate": 24000
 * }
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

let _cached = null;

function getConfig() {
  // Re-read every call so hot changes to config.json take effect without restart
  let file = {};
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    file = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (_) { /* file absent or malformed — use defaults */ }

  const useOllama =
    process.env.EASY_JOT_USE_OLLAMA === '1' ||
    process.env.EASY_JOT_USE_OLLAMA === 'true' ||
    file.useOllama === true ||
    file.provider === 'ollama';

  return {
    // OpenAI
    openaiApiKey: process.env.EASY_JOT_OPENAI_API_KEY || file.openaiApiKey || null,
    // Smallest AI (for Pulse STT and Lightning TTS)
    smallestAiKey: process.env.SMALLEST_AI_KEY || file.smallestAiKey || null,
    // LLM provider
    useOllama,
    model:         file.model         || 'gpt-4o-mini',
    ollamaBaseURL: file.ollamaBaseURL  || 'http://localhost:11434/v1',
    // TTS options
    ttsVoice:      file.ttsVoice      || 'emily',
    ttsSampleRate: file.ttsSampleRate || 24000,
    // STT language
    sttLanguage:   file.sttLanguage   || 'en',
  };
}

/**
 * Return the effective LLM base URL and API key for the OpenAI client.
 */
function getLLMClientConfig() {
  const cfg = getConfig();
  if (cfg.useOllama) {
    return { apiKey: 'ollama', model: cfg.model, baseURL: cfg.ollamaBaseURL };
  }
  return { apiKey: cfg.openaiApiKey, model: cfg.model, baseURL: undefined };
}

module.exports = { getConfig, getLLMClientConfig };
