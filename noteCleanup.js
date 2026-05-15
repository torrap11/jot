'use strict';

const aiOrganize = require('./aiOrganize');

/** Collapse whitespace and lowercase for duplicate detection (full-body). */
function normalizeNoteTextForDedup(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildCleanupSnapshot(database, noteLimit = 350, textMax = 900) {
  const folders = database.listFolders();
  const folderName = Object.fromEntries(folders.map((f) => [f.id, f.name]));
  const notes = database
    .listRecent(Math.max(noteLimit, 1), 'all')
    .map((n) => ({
      id: n.id,
      folder: n.folder_id != null ? folderName[n.folder_id] || null : null,
      text: String(n.text || '').slice(0, textMax),
    }));
  return { folders: folders.map((f) => ({ id: f.id, name: f.name })), notes };
}

const CLEANUP_SYSTEM = `You help deduplicate and reorganize notes in the app "Jot". Notes are meant to capture ideas and concepts — wording may differ while the idea repeats.

You receive JSON: "folders" [{id, name}] and "notes" [{id, text, folder}]. Propose a minimal, safe cleanup.

Reply with a single JSON object only (no markdown fences). Shape:
{"reply":"<short summary for the user>","plan":[...]}

"plan" is an array of operations in execution order.

Allowed operations (use only note ids from the snapshot):
- {"op":"createFolder","name":"<string>"}
- {"op":"mergeNotes","keeperId":<number>,"removeIds":[<number>...],"mergedText":"<string>"} — one canonical note body (clear, non-redundant). Reassigns attachments from removed notes to the keeper. removeIds must not include keeperId.
- {"op":"deleteNote","noteId":<number>} — only when a note is empty noise or a true duplicate with zero unique value after merges.
- {"op":"updateNoteText","noteId":<number>,"text":"<string>"} — condense one bloated note in place (non-empty text).
- {"op":"moveNote","noteId":<number>,"folderId":<number>} — existing folder id from snapshot
- {"op":"moveNote","noteId":<number>,"folderName":"<string>"} — must match a folder you created earlier or an existing folder name
- {"op":"moveNote","noteId":<number>,"unfiled":true}

Rules:
- Prefer mergeNotes over deleteNote when two notes express the same idea.
- Be conservative: if unsure, skip rather than merge unrelated topics.
- Put every createFolder before moveNote steps that reference new folder names.
- If nothing needs changing, return "plan": [] and a brief reply.`;

function extractJsonObject(text) {
  const s = String(text || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1].trim() : s;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(body.slice(start, end + 1));
}

async function callAnthropic({ apiKey, model, system, messages }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system,
      messages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.message || res.statusText;
    throw new Error(msg || `Anthropic API error ${res.status}`);
  }
  const block = (data.content || []).find((b) => b.type === 'text');
  return block ? block.text : '';
}

const CLEANUP_USER_MESSAGE = `Run a one-pass library cleanup: merge near-duplicate or overlapping concept notes, delete only obvious junk duplicates, optionally split overcrowded folders into clearer subfolders (createFolder + moveNote), and condense verbose single notes when needed. Stay conservative.`;

async function cleanupChat(database, { userDataDir }) {
  const { apiKey, model } = aiOrganize.readAnthropicCredentials(userDataDir);
  if (!apiKey) {
    return {
      error:
        'No API key configured. Add your Anthropic key via the API key flow — AI cleanup was skipped. Local duplicate removal still ran.',
    };
  }
  const snapshot = buildCleanupSnapshot(database);
  const payload = `${CLEANUP_USER_MESSAGE}\n\n--- current notes (JSON) ---\n${JSON.stringify(snapshot)}`;
  const text = await callAnthropic({
    apiKey,
    model,
    system: CLEANUP_SYSTEM,
    messages: [{ role: 'user', content: payload }],
  });
  let parsed;
  try {
    parsed = extractJsonObject(text);
  } catch (e) {
    return { error: `Could not parse AI response: ${e.message}`, raw: text };
  }
  if (parsed.reply == null) {
    return { error: 'Invalid response shape (missing reply)', raw: text };
  }
  const plan = Array.isArray(parsed.plan) ? parsed.plan : [];
  return { reply: String(parsed.reply), plan, raw: text };
}

function sortCleanupPlan(plan) {
  const list = Array.isArray(plan) ? plan : [];
  const creates = list.filter((p) => p && p.op === 'createFolder');
  const merges = list.filter((p) => p && p.op === 'mergeNotes');
  const deletes = list.filter((p) => p && p.op === 'deleteNote');
  const updates = list.filter((p) => p && p.op === 'updateNoteText');
  const moves = list.filter((p) => p && p.op === 'moveNote');
  return [...creates, ...merges, ...deletes, ...updates, ...moves];
}

/**
 * @returns {{ applied: object[], errors: string[], imagePaths: string[], filePaths: string[] }}
 */
function applyCleanupPlan(database, plan) {
  const sorted = sortCleanupPlan(plan);
  const noteRows = database.listRecent(100_000, 'all');
  const validNoteIds = new Set(noteRows.map((n) => n.id));
  const applied = [];
  const errors = [];
  const imagePaths = [];
  const filePaths = [];

  let folders = database.listFolders();

  const collectPathsFor = (ids) => {
    const nids = [...new Set(ids.map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0))];
    if (nids.length === 0) return;
    imagePaths.push(...database.getImagePathsForNotes(nids));
    filePaths.push(...database.getFilePathsForNotes(nids));
  };

  for (const step of sorted) {
    if (step.op === 'createFolder') {
      const name = String(step.name || '').trim();
      if (!name) {
        errors.push('createFolder: empty name');
        continue;
      }
      const exists = folders.some((f) => f.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        applied.push({ op: 'createFolder', name, skipped: true });
        continue;
      }
      const created = database.createFolder(name);
      if (created) {
        folders = database.listFolders();
        applied.push({ op: 'createFolder', id: created.id, name: created.name });
      } else {
        errors.push(`createFolder: failed for "${name}"`);
      }
      continue;
    }

    if (step.op === 'mergeNotes') {
      const keeperId = Number(step.keeperId);
      const removeIds = Array.isArray(step.removeIds) ? step.removeIds : [];
      const mergedText = String(step.mergedText || '').trim();
      if (!Number.isFinite(keeperId) || keeperId < 1 || !validNoteIds.has(keeperId)) {
        errors.push(`mergeNotes: invalid keeperId ${step.keeperId}`);
        continue;
      }
      const absorb = [
        ...new Set(
          removeIds
            .map((x) => Number(x))
            .filter((x) => Number.isFinite(x) && x > 0 && x !== keeperId && validNoteIds.has(x)),
        ),
      ];
      if (absorb.length === 0) {
        errors.push('mergeNotes: empty removeIds');
        continue;
      }
      if (!mergedText) {
        errors.push('mergeNotes: mergedText required');
        continue;
      }
      const result = database.mergeNotesIntoKeeper(keeperId, absorb, mergedText);
      if (!result.ok) {
        errors.push(`mergeNotes: ${result.error || 'failed'}`);
        continue;
      }
      for (const id of absorb) validNoteIds.delete(id);
      applied.push({ op: 'mergeNotes', keeperId, removeIds: absorb, mergedChars: mergedText.length });
      continue;
    }

    if (step.op === 'deleteNote') {
      const noteId = Number(step.noteId);
      if (!Number.isFinite(noteId) || !validNoteIds.has(noteId)) {
        errors.push(`deleteNote: invalid noteId ${step.noteId}`);
        continue;
      }
      collectPathsFor([noteId]);
      const ok = database.deleteNote(noteId);
      if (!ok) {
        errors.push(`deleteNote: failed for ${noteId}`);
        continue;
      }
      validNoteIds.delete(noteId);
      applied.push({ op: 'deleteNote', noteId });
      continue;
    }

    if (step.op === 'updateNoteText') {
      const noteId = Number(step.noteId);
      const text = String(step.text || '').trim();
      if (!Number.isFinite(noteId) || !validNoteIds.has(noteId)) {
        errors.push(`updateNoteText: invalid noteId ${step.noteId}`);
        continue;
      }
      if (!text) {
        errors.push(`updateNoteText: empty text for ${noteId}`);
        continue;
      }
      const updated = database.updateNote(noteId, text);
      if (!updated) {
        errors.push(`updateNoteText: failed for ${noteId}`);
        continue;
      }
      applied.push({ op: 'updateNoteText', noteId });
      continue;
    }

    if (step.op === 'moveNote') {
      const noteId = Number(step.noteId);
      if (!Number.isFinite(noteId) || !validNoteIds.has(noteId)) {
        errors.push(`moveNote: invalid noteId ${step.noteId}`);
        continue;
      }
      if (step.unfiled === true) {
        database.setNoteFolder(noteId, 'unfiled');
        applied.push({ op: 'moveNote', noteId, unfiled: true });
        continue;
      }
      const folderIdRaw = step.folderId;
      if (folderIdRaw != null && folderIdRaw !== '') {
        const folderId = Number(folderIdRaw);
        if (!Number.isFinite(folderId)) {
          errors.push(`moveNote: invalid folderId for note ${noteId}`);
          continue;
        }
        folders = database.listFolders();
        const exists = folders.some((f) => f.id === folderId);
        if (!exists) {
          errors.push(`moveNote: folderId ${folderId} not found`);
          continue;
        }
        database.setNoteFolder(noteId, folderId);
        applied.push({ op: 'moveNote', noteId, folderId });
        continue;
      }
      const folderName = String(step.folderName || '').trim();
      if (folderName) {
        folders = database.listFolders();
        const hit = folders.find((f) => f.name.toLowerCase() === folderName.toLowerCase());
        if (!hit) {
          errors.push(`moveNote: folderName "${folderName}" not found`);
          continue;
        }
        database.setNoteFolder(noteId, hit.id);
        applied.push({ op: 'moveNote', noteId, folderId: hit.id, folderName });
        continue;
      }
      errors.push(`moveNote: missing target for note ${noteId}`);
    }
  }

  return { applied, errors, imagePaths, filePaths };
}

/**
 * Runs deterministic dedupe passes (exact timestamp dupes + normalized full-text dupes).
 * @param {typeof import('./database')} database
 */
function runLocalCleanup(database) {
  const a = database.deduplicateNotesByTextAndCreatedAt();
  const b = database.deduplicateNotesByNormalizedText();
  const prunedFolders = database.pruneEmptyFolders();
  return {
    exactDupes: a,
    normalizedDupes: b,
    prunedFolders,
  };
}

module.exports = {
  normalizeNoteTextForDedup,
  buildCleanupSnapshot,
  cleanupChat,
  applyCleanupPlan,
  runLocalCleanup,
  sortCleanupPlan,
};
