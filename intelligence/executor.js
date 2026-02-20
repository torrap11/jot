'use strict';

const VALID_TYPES = new Set([
  'search', 'create_note', 'create_folder', 'move_note_to_folder', 'organize_into_folders',
]);

/**
 * Execute an array of actions against the database.
 * @param {Array<{type: string, payload: any}>} actions
 * @param {object} db  The database module (database.js exports)
 * @returns {{ success: boolean, results: any[], errors: any[] }}
 */
async function executeActions(actions, db) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return { success: true, results: [], errors: [] };
  }

  const results = [];
  const errors  = [];

  for (const action of actions) {
    if (!VALID_TYPES.has(action.type)) {
      errors.push({ type: action.type, error: `Unknown action type: ${action.type}` });
      continue;
    }
    try {
      const result = executeSingle(action, db);
      results.push({ type: action.type, result });
    } catch (err) {
      errors.push({ type: action.type, error: err.message });
    }
  }

  return { success: errors.length === 0, results, errors };
}

function executeSingle(action, db) {
  const { type, payload } = action;

  switch (type) {
    case 'search': {
      const q = (payload.query || '').toLowerCase();
      const all = db.getAllNotes();
      const matches = all.filter(
        n => !n.content.startsWith('data:image/') &&
             n.content.toLowerCase().includes(q)
      );
      return { noteIds: matches.map(n => n.id), count: matches.length };
    }

    case 'create_note': {
      return db.createNote(payload.content || '');
    }

    case 'create_folder': {
      return db.createFolder(payload.name);
    }

    case 'move_note_to_folder': {
      const { noteId, folderId } = payload;
      db.updateNoteFolder(noteId, folderId ?? null);
      return { noteId, folderId: folderId ?? null };
    }

    case 'organize_into_folders': {
      // payload is an array of { folderName, noteIds }
      const groups = Array.isArray(payload) ? payload : [];
      const allFolders = db.getAllFolders();
      const created = [];

      for (const group of groups) {
        // Reuse existing folder with same name (case-insensitive) or create new
        const existing = allFolders.find(
          f => f.name.toLowerCase() === (group.folderName || '').toLowerCase()
        );
        const folder = existing || db.createFolder(group.folderName);
        if (!existing) allFolders.push(folder); // keep local list in sync

        const noteIds = Array.isArray(group.noteIds) ? group.noteIds : [];
        for (const noteId of noteIds) {
          db.updateNoteFolder(noteId, folder.id);
        }
        created.push({ folder, movedNoteIds: noteIds });
      }
      return created;
    }
  }
}

module.exports = { executeActions };
