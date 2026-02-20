const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const OLLAMA_BASE = 'http://localhost:11434/v1';

function getConfig() {
  const envKey = process.env.JOT_OPENAI_API_KEY;
  const useOllamaEnv = process.env.JOT_USE_OLLAMA === '1' || process.env.JOT_USE_OLLAMA === 'true';

  let fileConfig = {};
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (_) { /* file absent or malformed — ignore */ }

  const useOllama = useOllamaEnv || fileConfig.useOllama === true || fileConfig.provider === 'ollama';

  if (useOllama) {
    return {
      apiKey:  'ollama', // Ollama ignores it but OpenAI client requires it
      model:   fileConfig.model || 'llama3.2',
      baseURL: fileConfig.ollamaBaseURL || OLLAMA_BASE,
    };
  }

  return {
    apiKey:  envKey || fileConfig.openaiApiKey || null,
    model:   fileConfig.model   || 'gpt-4o-mini',
    baseURL: fileConfig.baseURL || undefined,
  };
}

/**
 * Call the LLM with a system prompt, user message, and optional notes context.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {Array<{id: number, content: string}>} notesContext
 * @returns {Promise<string>} raw text response
 * @throws {Error} on missing key or API failure
 */
async function callLLM(systemPrompt, userMessage, notesContext = []) {
  const { apiKey, model, baseURL } = getConfig();
  const useOllama = baseURL && baseURL.includes('11434');

  if (!useOllama && !apiKey) {
    throw new Error(
      'No API key configured. Set JOT_OPENAI_API_KEY, or use Ollama: add {"useOllama": true} to ' +
      path.join(app.getPath('userData'), 'config.json') + ' and run `ollama pull llama3.2`.'
    );
  }

  const client = new OpenAI({ apiKey: apiKey || 'ollama', ...(baseURL ? { baseURL } : {}) });

  // Build notes context — skip image notes (base64 data URLs)
  const textNotes = notesContext.filter(n => !n.content.startsWith('data:image/'));
  let fullUserMessage = userMessage;
  if (textNotes.length > 0) {
    const notesBlock = textNotes
      .map(n => `[Note ${n.id}]\n${n.content.substring(0, 500)}`)
      .join('\n\n---\n\n');
    fullUserMessage = `${userMessage}\n\n===\nJots:\n\n${notesBlock}`;
  }

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: fullUserMessage },
    ],
  });

  return completion.choices[0].message.content;
}

module.exports = { callLLM };
