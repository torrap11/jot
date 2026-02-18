const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDb() {
  if (db) return db;
  const dbPath = path.join(app.getPath('userData'), 'jot.db');
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
  return db;
}

function getAllNotes() {
  return getDb().prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
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

module.exports = { getAllNotes, createNote, updateNote, deleteNote };
