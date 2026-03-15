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

  // Intent memories table for voice-triggered context memory
  db.exec(`
    CREATE TABLE IF NOT EXISTS intent_memories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      content    TEXT NOT NULL,
      trigger    TEXT NOT NULL DEFAULT 'general',
      category   TEXT NOT NULL DEFAULT 'other',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      note_id    INTEGER,
      embedding  TEXT
    )
  `);

  // Scheduled reminders table for time-based spoken reminders
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_reminders (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      content           TEXT NOT NULL,
      schedule_type     TEXT NOT NULL DEFAULT 'once',
      scheduled_time    TEXT NOT NULL,
      active            INTEGER NOT NULL DEFAULT 1,
      last_triggered_at TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

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

// ── Intent Memory helpers ──────────────────────────────────────────────────

/**
 * Persist a structured intent memory.
 * @param {{ content: string, trigger: string, category: string, note_id?: number }} data
 */
function createIntentMemory({ content, trigger = 'general', category = 'other', note_id = null }) {
  const stmt = getDb().prepare(
    'INSERT INTO intent_memories (content, trigger, category, note_id) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(content, trigger, category, note_id);
  return getDb().prepare('SELECT * FROM intent_memories WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Retrieve all memories that match a given trigger ID.
 * @param {string} trigger
 */
function getIntentMemoriesByTrigger(trigger) {
  return getDb()
    .prepare('SELECT * FROM intent_memories WHERE trigger = ? ORDER BY created_at DESC')
    .all(trigger);
}

/**
 * Full-text search across all memory content (case-insensitive).
 * @param {string} query
 */
function searchIntentMemories(query) {
  const q = `%${(query || '').toLowerCase()}%`;
  return getDb()
    .prepare('SELECT * FROM intent_memories WHERE lower(content) LIKE ? ORDER BY created_at DESC')
    .all(q);
}

/** Return all intent memories, newest first. */
function getAllIntentMemories() {
  return getDb().prepare('SELECT * FROM intent_memories ORDER BY created_at DESC').all();
}

/** Delete a single intent memory by id. */
function deleteIntentMemory(id) {
  getDb().prepare('DELETE FROM intent_memories WHERE id = ?').run(id);
}

// ── Scheduled Reminder helpers ─────────────────────────────────────────────

/**
 * Create a new scheduled reminder.
 * @param {{ content: string, scheduleType: 'once'|'daily', scheduledTime: string }} data
 */
function createScheduledReminder({ content, scheduleType = 'once', scheduledTime }) {
  const stmt = getDb().prepare(
    'INSERT INTO scheduled_reminders (content, schedule_type, scheduled_time) VALUES (?, ?, ?)'
  );
  const result = stmt.run(content, scheduleType, scheduledTime);
  return getDb().prepare('SELECT * FROM scheduled_reminders WHERE id = ?').get(result.lastInsertRowid);
}

/** Return all active reminders (active = 1). */
function getActiveReminders() {
  return getDb().prepare('SELECT * FROM scheduled_reminders WHERE active = 1').all();
}

/** Return all reminders, newest first. */
function getAllScheduledReminders() {
  return getDb().prepare('SELECT * FROM scheduled_reminders ORDER BY created_at DESC').all();
}

/** Delete a scheduled reminder by id. */
function deleteScheduledReminder(id) {
  getDb().prepare('DELETE FROM scheduled_reminders WHERE id = ?').run(id);
}

/** Mark a reminder as triggered (set last_triggered_at to now). */
function markReminderTriggered(id) {
  getDb()
    .prepare("UPDATE scheduled_reminders SET last_triggered_at = datetime('now') WHERE id = ?")
    .run(id);
}

/** Deactivate a reminder (active = 0). Used for stale once-reminders. */
function deactivateReminder(id) {
  getDb().prepare('UPDATE scheduled_reminders SET active = 0 WHERE id = ?').run(id);
}

/** Reactivate a reminder (active = 1). */
function activateReminder(id) {
  getDb().prepare('UPDATE scheduled_reminders SET active = 1 WHERE id = ?').run(id);
}

module.exports = {
  getAllNotes, createNote, updateNote, deleteNote, restoreNote,
  createFolder, updateFolder, getAllFolders, updateNoteFolder, getNotesByFolder,
  createIntentMemory, getIntentMemoriesByTrigger, searchIntentMemories,
  getAllIntentMemories, deleteIntentMemory,
  createScheduledReminder, getActiveReminders, getAllScheduledReminders,
  deleteScheduledReminder, markReminderTriggered, deactivateReminder, activateReminder,
};
