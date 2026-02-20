const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDb() {
  if (db) return db;
  const dbPath = path.join(app.getPath('userData'), 'easy-jot.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Safe migration: add description to folders if it doesn't exist yet
  const folderCols = db.pragma('table_info(folders)').map(c => c.name);
  if (!folderCols.includes('description')) {
    db.exec('ALTER TABLE folders ADD COLUMN description TEXT');
  }
  // Safe migration: add folder_id to notes if it doesn't exist yet
  const cols = db.pragma('table_info(notes)').map(c => c.name);
  if (!cols.includes('folder_id')) {
    db.exec('ALTER TABLE notes ADD COLUMN folder_id INTEGER REFERENCES folders(id)');
  }
  return db;
}

function getAllNotes(folderId) {
  if (folderId === undefined) {
    return getDb().prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
  }
  if (folderId === null) {
    return getDb().prepare('SELECT * FROM notes WHERE folder_id IS NULL ORDER BY updated_at DESC').all();
  }
  return getDb().prepare('SELECT * FROM notes WHERE folder_id = ? ORDER BY updated_at DESC').all(folderId);
}

function createNote(content = '') {
  const stmt = getDb().prepare('INSERT INTO notes (content) VALUES (?)');
  const result = stmt.run(content);
  return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
}

function updateNote(id, content) {
  getDb().prepare("UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, id);
  return getDb().prepare('SELECT * FROM notes WHERE id = ?').get(id);
}

function deleteNote(id) {
  getDb().prepare('DELETE FROM notes WHERE id = ?').run(id);
}

function restoreNote(note) {
  getDb()
    .prepare(
      'INSERT INTO notes (id, content, folder_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(note.id, note.content, note.folder_id ?? null, note.created_at, note.updated_at);
}

function createFolder(name, description = '') {
  const stmt = getDb().prepare('INSERT INTO folders (name, description) VALUES (?, ?)');
  const result = stmt.run(name, description || null);
  return getDb().prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
}

function updateFolder(id, name, description) {
  getDb()
    .prepare('UPDATE folders SET name = ?, description = ? WHERE id = ?')
    .run(name, description || null, id);
  return getDb().prepare('SELECT * FROM folders WHERE id = ?').get(id);
}

function getAllFolders() {
  return getDb().prepare('SELECT * FROM folders ORDER BY name ASC').all();
}

function updateNoteFolder(noteId, folderId) {
  getDb()
    .prepare("UPDATE notes SET folder_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(folderId, noteId);
}

function getNotesByFolder(folderId) {
  return getAllNotes(folderId);
}

module.exports = {
  getAllNotes, createNote, updateNote, deleteNote, restoreNote,
  createFolder, updateFolder, getAllFolders, updateNoteFolder, getNotesByFolder,
};
