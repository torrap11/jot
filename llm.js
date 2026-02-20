const { OpenAI } = require('openai');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const OLLAMA_BASE = 'http://localhost:11434/v1';

function getConfig() {
  const envKey = process.env.EASY_JOT_OPENAI_API_KEY;
  const useOllamaEnv = process.env.EASY_JOT_USE_OLLAMA === '1' || process.env.EASY_JOT_USE_OLLAMA === 'true';

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

const STRUCTURED_SYSTEM_PROMPT = `You are an action-planning assistant for a sticky-note app.
Given the user's instruction and their notes, respond with ONLY a valid JSON array of action objects.

Available action types:
  {"type":"search",               "payload":{"query":"<search term>"}}
  {"type":"create_note",          "payload":{"content":"<note text>"}}
  {"type":"create_folder",        "payload":{"name":"<folder name>"}}
  {"type":"move_note_to_folder",  "payload":{"noteId":<id>,"folderId":<id>}}
  {"type":"organize_into_folders","payload":[{"folderName":"<name>","noteIds":[<id>,...]}]}

Rules:
- Return ONLY the JSON array — no prose, no markdown fences, no explanation.
- Use only the note IDs provided in the context.
- For organize_into_folders you may create new folder names if appropriate.
- If the request is purely informational with no actions, return [{"type":"search","payload":{"query":"<rephrased query>"}}].`;

function tryParseJsonArray(str) {
  try {
    const v = JSON.parse(str);
    if (Array.isArray(v) && v.length >= 0) return v;
  } catch (_) {}
  return null;
}

function fixCommonJsonIssues(str) {
  return str.replace(/,(\s*[}\]])/g, '$1');  // trailing commas
}

function extractJsonArray(raw) {
  let trimmed = raw.trim();

  // Strip common LLM prefixes
  const prefixes = [
    /^here (?:is|are) (?:the )?(?:json|actions?)(?:\s*:)?\s*/i,
    /^the (?:json|actions?)(?:\s*:)?\s*/i,
    /^```(?:json)?\s*/i,
    /^sure[.!]?\s*/i,
    /^certainly[.!]?\s*/i,
  ];
  for (const re of prefixes) {
    trimmed = trimmed.replace(re, '').trim();
  }
  trimmed = trimmed.replace(/\s*```\s*$/g, '').trim();

  // Direct parse
  let v = tryParseJsonArray(trimmed);
  if (v) return v;

  // Code-fence extraction
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    v = tryParseJsonArray(fence[1].trim());
    if (v) return v;
    v = tryParseJsonArray(fixCommonJsonIssues(fence[1].trim()));
    if (v) return v;
  }

  // Find array literal — match balanced brackets
  const arrMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    v = tryParseJsonArray(arrMatch[0]);
    if (v) return v;
    v = tryParseJsonArray(fixCommonJsonIssues(arrMatch[0]));
    if (v) return v;
  }

  // Last resort: try fixing the whole string
  v = tryParseJsonArray(fixCommonJsonIssues(trimmed));
  if (v) return v;

  throw new Error('LLM response did not contain a valid JSON array of actions.');
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
      'Set EASY_JOT_OPENAI_API_KEY or add openaiApiKey to config.json to use Easy Jot Agent. ' +
      'Or use Ollama: add {"useOllama": true} to config.json and run `ollama pull llama3.2`.'
    );
  }

  const client = new OpenAI({ apiKey: apiKey || 'ollama', ...(baseURL ? { baseURL } : {}) });

  // Build notes context — image notes become placeholders so LLM knows they exist
  let fullUserMessage = userMessage;
  if (notesContext.length > 0) {
    const notesBlock = notesContext
      .map(n => n.content.startsWith('data:image/')
        ? `[Note ${n.id}]\n(image note)`
        : `[Note ${n.id}]\n${n.content.substring(0, 500)}`)
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

/**
 * Call the LLM requesting a JSON array of actions.
 * @param {string} userMessage
 * @param {Array<{id: number, content: string}>} notesContext
 * @returns {Promise<Array<{type: string, payload: any}>>}
 * @throws {Error} on API failure or invalid JSON
 */
async function callLLMWithStructuredOutput(userMessage, notesContext = []) {
  const { apiKey, model, baseURL } = getConfig();
  const useOllama = baseURL && baseURL.includes('11434');

  if (!useOllama && !apiKey) {
    throw new Error(
      'Set EASY_JOT_OPENAI_API_KEY or add openaiApiKey to config.json to use Easy Jot Agent. ' +
      'Or use Ollama: add {"useOllama": true} to config.json.'
    );
  }

  const client = new OpenAI({ apiKey: apiKey || 'ollama', ...(baseURL ? { baseURL } : {}) });

  // Build notes context — image notes become placeholders so LLM knows they exist
  let fullUserMessage = userMessage;
  if (notesContext.length > 0) {
    const notesBlock = notesContext
      .map(n => n.content.startsWith('data:image/')
        ? `[Note ${n.id}]\n(image note)`
        : `[Note ${n.id}]\n${n.content.substring(0, 500)}`)
      .join('\n\n---\n\n');
    fullUserMessage = `${userMessage}\n\n===\nJots:\n\n${notesBlock}`;
  }

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: STRUCTURED_SYSTEM_PROMPT },
      { role: 'user',   content: fullUserMessage },
    ],
  });

  const raw = completion.choices[0].message.content;
  try {
    return extractJsonArray(raw);
  } catch (_) {
    // Fallback: LLM returned prose or malformed JSON — treat as search
    const query = userMessage.slice(0, 80).replace(/"/g, '').trim() || 'notes';
    return [{ type: 'search', payload: { query } }];
  }
}

module.exports = { callLLM, callLLMWithStructuredOutput };
