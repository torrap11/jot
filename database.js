'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;
/** Cached: 'app_key' | 'bundle_id' | 'both' (legacy tables can have NOT NULL bundle_id + added app_key). */
let cachedNoteLinkMode = null;

function getDb() {
  if (db) return db;
  const dbPath = path.join(app.getPath('userData'), 'proactive-recall.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS note_app_links (
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      app_key TEXT NOT NULL,
      PRIMARY KEY (note_id, app_key)
    );

    CREATE TABLE IF NOT EXISTS note_surface_state (
      note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      app_key TEXT NOT NULL,
      snoozed_until TEXT,
      dismissed INTEGER NOT NULL DEFAULT 0,
      last_surfaced_at TEXT,
      surfaced_day TEXT,
      surfaced_count_day INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (note_id, app_key)
    );
  `);

  migrateLegacy();
  return db;
}

function migrateLegacy() {
  const database = getDb();
  const cols = database.pragma('table_info(notes)').map((c) => c.name);

  // Do not early-return when `text` exists — older DBs still need completed_at and link fixes.
  if (!cols.includes('text')) {
    if (cols.includes('title') || cols.includes('content')) {
      database.exec("ALTER TABLE notes ADD COLUMN text TEXT NOT NULL DEFAULT ''");
      database.exec("UPDATE notes SET text = trim(COALESCE(title, '') || '\n' || COALESCE(content, ''))");
      database.exec("UPDATE notes SET text = content WHERE text = '' AND COALESCE(content, '') <> ''");
      database.exec("UPDATE notes SET text = title WHERE text = '' AND COALESCE(title, '') <> ''");
      database.exec("UPDATE notes SET text = '(empty note)' WHERE text = ''");
    }
  }

  if (!cols.includes('completed_at')) {
    database.exec('ALTER TABLE notes ADD COLUMN completed_at TEXT');
  }

  const linkCols = database.pragma('table_info(note_app_links)').map((c) => c.name);
  if (linkCols.includes('bundle_id') && !linkCols.includes('app_key')) {
    database.exec("ALTER TABLE note_app_links ADD COLUMN app_key TEXT");
    database.exec("UPDATE note_app_links SET app_key = bundle_id WHERE app_key IS NULL");
  }

  if (linkCols.includes('app_key')) {
    database.exec("UPDATE note_app_links SET app_key = 'com.spotify.client' WHERE lower(app_key) = 'spotify'");
    database.exec(
      "UPDATE note_app_links SET app_key = 'com.apple.AppStore' WHERE lower(app_key) IN ('app store', 'appstore', 'mac app store')"
    );
  }
  if (linkCols.includes('bundle_id')) {
    database.exec("UPDATE note_app_links SET bundle_id = 'com.spotify.client' WHERE lower(bundle_id) = 'spotify'");
    database.exec(
      "UPDATE note_app_links SET bundle_id = 'com.apple.AppStore' WHERE lower(bundle_id) IN ('app store', 'appstore', 'mac app store')"
    );
  }

  const surfaceCols = database.pragma('table_info(note_surface_state)').map((c) => c.name);
  if (surfaceCols.includes('app_key')) {
    database.exec("UPDATE note_surface_state SET app_key = 'com.spotify.client' WHERE lower(app_key) = 'spotify'");
    database.exec(
      "UPDATE note_surface_state SET app_key = 'com.apple.AppStore' WHERE lower(app_key) IN ('app store', 'appstore', 'mac app store')"
    );
  }

  cachedNoteLinkMode = null;
}

function getNoteLinkMode() {
  if (cachedNoteLinkMode) return cachedNoteLinkMode;
  const cols = getDb().pragma('table_info(note_app_links)').map((c) => c.name);
  const hasApp = cols.includes('app_key');
  const hasBundle = cols.includes('bundle_id');
  if (hasApp && hasBundle) cachedNoteLinkMode = 'both';
  else cachedNoteLinkMode = hasApp ? 'app_key' : 'bundle_id';
  return cachedNoteLinkMode;
}

function normalizeText(input) {
  return String(input || '').trim();
}

function createNote(text) {
  const value = normalizeText(text);
  if (!value) return null;
  const result = getDb()
    .prepare("INSERT INTO notes (text, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))")
    .run(value);
  return getNote(result.lastInsertRowid);
}

function updateNote(id, text) {
  const value = normalizeText(text);
  if (!value) return null;
  getDb()
    .prepare("UPDATE notes SET text = ?, updated_at = datetime('now') WHERE id = ?")
    .run(value, id);
  return getNote(id);
}

function deleteNote(id) {
  const nid = Number(id);
  if (!Number.isFinite(nid) || nid < 1) return false;
  const result = getDb().prepare('DELETE FROM notes WHERE id = ?').run(nid);
  return result.changes > 0;
}

function deleteNotes(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const normalized = [...new Set(ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))];
  if (normalized.length === 0) return 0;

  const stmt = getDb().prepare('DELETE FROM notes WHERE id = ?');
  const tx = getDb().transaction((values) => {
    let count = 0;
    for (const id of values) {
      count += stmt.run(id).changes;
    }
    return count;
  });
  return tx(normalized);
}

function completeNote(id) {
  const nid = Number(id);
  if (!Number.isFinite(nid) || nid < 1) return false;
  const result = getDb()
    .prepare("UPDATE notes SET completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .run(nid);
  return result.changes > 0;
}

function getNote(id) {
  return getDb().prepare('SELECT id, text, created_at FROM notes WHERE id = ?').get(id) || null;
}

function listRecent(limit = 200) {
  return getDb()
    .prepare('SELECT id, text, created_at FROM notes ORDER BY datetime(created_at) DESC LIMIT ?')
    .all(limit);
}

function searchNotes(query, limit = 20) {
  const q = normalizeText(query).toLowerCase();
  if (!q) return listRecent(limit);

  const like = `%${q}%`;
  return getDb()
    .prepare(`
      SELECT id, text, created_at,
        CASE
          WHEN lower(text) = ? THEN 100
          WHEN lower(text) LIKE ? THEN 60
          ELSE 20
        END + (
          CASE
            WHEN datetime(created_at) >= datetime('now', '-1 day') THEN 15
            WHEN datetime(created_at) >= datetime('now', '-7 days') THEN 8
            ELSE 0
          END
        ) AS score
      FROM notes
      WHERE lower(text) LIKE ?
      ORDER BY score DESC, datetime(created_at) DESC
      LIMIT ?
    `)
    .all(q, `${q}%`, like, limit);
}

function linkNoteToApp(noteId, appKey) {
  const mode = getNoteLinkMode();
  if (mode === 'both') {
    getDb()
      .prepare(
        'INSERT OR IGNORE INTO note_app_links (note_id, bundle_id, app_key) VALUES (?, ?, ?)'
      )
      .run(noteId, appKey, appKey);
  } else {
    getDb()
      .prepare(`INSERT OR IGNORE INTO note_app_links (note_id, ${mode}) VALUES (?, ?)`)
      .run(noteId, appKey);
  }
}

function unlinkNoteFromApp(noteId, appKey) {
  const mode = getNoteLinkMode();
  if (mode === 'both') {
    getDb()
      .prepare(
        'DELETE FROM note_app_links WHERE note_id = ? AND (app_key = ? OR bundle_id = ?)'
      )
      .run(noteId, appKey, appKey);
  } else {
    getDb()
      .prepare(`DELETE FROM note_app_links WHERE note_id = ? AND ${mode} = ?`)
      .run(noteId, appKey);
  }
}

function getLinksForNote(noteId) {
  const mode = getNoteLinkMode();
  if (mode === 'both') {
    return getDb()
      .prepare(
        `SELECT COALESCE(NULLIF(TRIM(app_key), ''), NULLIF(TRIM(bundle_id), '')) AS k
         FROM note_app_links
         WHERE note_id = ?
           AND COALESCE(NULLIF(TRIM(app_key), ''), NULLIF(TRIM(bundle_id), '')) IS NOT NULL
         ORDER BY k ASC`
      )
      .all(noteId)
      .map((row) => row.k)
      .filter(Boolean);
  }
  return getDb()
    .prepare(`SELECT ${mode} AS k FROM note_app_links WHERE note_id = ? ORDER BY k ASC`)
    .all(noteId)
    .map((row) => row.k)
    .filter(Boolean);
}

function getNotesLinkedToApp(appKey, limit = 50) {
  const mode = getNoteLinkMode();
  if (mode === 'both') {
    return getDb()
      .prepare(`
        SELECT n.id, n.text, n.created_at
        FROM notes n
        INNER JOIN note_app_links l ON l.note_id = n.id
        WHERE (l.app_key = ? OR l.bundle_id = ?)
          AND n.completed_at IS NULL
        ORDER BY datetime(n.created_at) DESC
        LIMIT ?
      `)
      .all(appKey, appKey, limit);
  }
  return getDb()
    .prepare(`
      SELECT n.id, n.text, n.created_at
      FROM notes n
      INNER JOIN note_app_links l ON l.note_id = n.id
      WHERE l.${mode} = ?
        AND n.completed_at IS NULL
      ORDER BY datetime(n.created_at) DESC
      LIMIT ?
    `)
    .all(appKey, limit);
}

function getKeywordCandidates(keywords, limit = 50) {
  if (!Array.isArray(keywords) || keywords.length === 0) return [];
  const likeClauses = keywords.map(() => 'lower(text) LIKE ?').join(' OR ');
  const values = keywords.map((k) => `%${k.toLowerCase()}%`);
  return getDb()
    .prepare(`
      SELECT id, text, created_at
      FROM notes
      WHERE (${likeClauses})
        AND completed_at IS NULL
      ORDER BY datetime(created_at) DESC
      LIMIT ?
    `)
    .all(...values, limit);
}

function getSurfaceState(noteId, appKey) {
  return getDb()
    .prepare(`
      SELECT note_id, app_key, snoozed_until, dismissed, last_surfaced_at, surfaced_day, surfaced_count_day
      FROM note_surface_state
      WHERE note_id = ? AND app_key = ?
    `)
    .get(noteId, appKey);
}

function upsertSurfaceState(noteId, appKey) {
  getDb()
    .prepare('INSERT OR IGNORE INTO note_surface_state (note_id, app_key) VALUES (?, ?)')
    .run(noteId, appKey);
}

function snoozeNote(noteId, appKey, minutes) {
  upsertSurfaceState(noteId, appKey);
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  getDb()
    .prepare('UPDATE note_surface_state SET snoozed_until = ?, dismissed = 0 WHERE note_id = ? AND app_key = ?')
    .run(until, noteId, appKey);
}

function dismissNote(noteId, appKey) {
  upsertSurfaceState(noteId, appKey);
  getDb()
    .prepare('UPDATE note_surface_state SET dismissed = 1 WHERE note_id = ? AND app_key = ?')
    .run(noteId, appKey);
}

function canSurfaceNote(noteId, appKey) {
  const state = getSurfaceState(noteId, appKey);
  if (!state) return true;
  if (state.dismissed) return false;

  if (state.snoozed_until) {
    const until = new Date(state.snoozed_until);
    if (!Number.isNaN(until.getTime()) && until > new Date()) return false;
  }
  return true;
}

function recordSurfaced(noteId, appKey) {
  upsertSurfaceState(noteId, appKey);
  const today = new Date().toISOString().slice(0, 10);
  const existing = getSurfaceState(noteId, appKey);
  const nextCount = existing && existing.surfaced_day === today ? existing.surfaced_count_day + 1 : 1;

  getDb()
    .prepare(`
      UPDATE note_surface_state
      SET last_surfaced_at = datetime('now'),
          surfaced_day = ?,
          surfaced_count_day = ?,
          snoozed_until = NULL
      WHERE note_id = ? AND app_key = ?
    `)
    .run(today, nextCount, noteId, appKey);
}

module.exports = {
  createNote,
  updateNote,
  deleteNote,
  deleteNotes,
  completeNote,
  getNote,
  listRecent,
  searchNotes,
  linkNoteToApp,
  unlinkNoteFromApp,
  getLinksForNote,
  getNotesLinkedToApp,
  getKeywordCandidates,
  canSurfaceNote,
  recordSurfaced,
  snoozeNote,
  dismissNote,
};
