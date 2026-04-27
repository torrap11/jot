'use strict';

/**
 * Main process: tray-less MVP with three windows (capture, search, overlay) + app watcher.
 * Flows: ⌘P search, ⌘N capture (from search), quick capture save, note CRUD/links, overlay actions,
 * frontmost-app polling → surfaceEngine → overlay.
 */

const { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } = require('electron');
const path = require('path');

const db = require('./database');
const watcher = require('./appWatcher');
const surface = require('./surfaceEngine');
const { KNOWN_APPS, BUNDLE_ID_TO_NAME, resolveInputToBundleId } = require('./knownApps');

const PRELOAD_MAIN = path.join(__dirname, 'preload.js');

let captureWin = null;
let searchWin = null;
let overlayWin = null;
let lastSurfaceAt = 0;
let lastSurfaceAppKey = '';

const APP_CONFIG = {
  maxSurfacedNotes: 3,
  minGapMsBetweenSurfacing: 15 * 1000,
  overlayDismissMs: 10000,
  defaultSnoozeMinutes: 30,
};

function rendererWebPreferences() {
  return {
    preload: PRELOAD_MAIN,
    contextIsolation: true,
    nodeIntegration: false,
  };
}

function createCaptureWindow() {
  captureWin = new BrowserWindow({
    width: 560,
    height: 130,
    show: false,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: rendererWebPreferences(),
  });
  captureWin.on('closed', () => {
    captureWin = null;
  });
  captureWin.loadFile(path.join(__dirname, 'renderer', 'capture.html'));
}

function createSearchWindow() {
  searchWin = new BrowserWindow({
    width: 720,
    height: 580,
    show: false,
    title: 'Proactive Recall Search',
    webPreferences: rendererWebPreferences(),
  });
  searchWin.on('closed', () => {
    searchWin = null;
  });
  searchWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function getOverlayWindow() {
  if (overlayWin && !overlayWin.isDestroyed()) return overlayWin;
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  overlayWin = new BrowserWindow({
    width: 360,
    height: 220,
    x: sw - 375,
    y: sh - 240,
    frame: false,
    show: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'overlay', 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  overlayWin.setAlwaysOnTop(true, 'pop-up-menu');
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWin.loadFile(path.join(__dirname, 'overlay', 'overlay.html'));
  overlayWin.on('closed', () => {
    overlayWin = null;
  });
  return overlayWin;
}

function showCaptureWindow() {
  if (!captureWin || captureWin.isDestroyed()) createCaptureWindow();

  const present = () => {
    if (!captureWin || captureWin.isDestroyed()) return;
    captureWin.center();
    captureWin.show();
    captureWin.focus();
    captureWin.webContents.send('capture:focus');
  };

  if (captureWin.webContents.isLoading()) captureWin.webContents.once('did-finish-load', present);
  else present();
}

function hideCaptureWindow() {
  if (captureWin && !captureWin.isDestroyed()) captureWin.hide();
}

function showSearchWindow(payload = {}) {
  if (!searchWin || searchWin.isDestroyed()) createSearchWindow();

  const present = () => {
    if (!searchWin || searchWin.isDestroyed()) return;
    searchWin.show();
    searchWin.focus();
    searchWin.webContents.send('search:focus', payload);
  };

  if (searchWin.webContents.isLoading()) searchWin.webContents.once('did-finish-load', present);
  else present();
}

function hideSearchWindow() {
  if (searchWin && !searchWin.isDestroyed()) searchWin.hide();
}

function showOverlay(appKey, notes) {
  if (!notes || notes.length === 0) return;
  const now = Date.now();
  if (now - lastSurfaceAt < APP_CONFIG.minGapMsBetweenSurfacing && lastSurfaceAppKey === appKey) return;
  lastSurfaceAt = now;
  lastSurfaceAppKey = appKey;

  const win = getOverlayWindow();
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  win.setPosition(sw - 375, sh - 240);

  const payload = {
    appKey,
    appName: BUNDLE_ID_TO_NAME[appKey] || appKey,
    notes: notes.map((note) => ({ id: note.id, text: note.text })),
    autoDismissMs: APP_CONFIG.overlayDismissMs,
  };
  const send = () => {
    if (win.isDestroyed()) return;
    win.setAlwaysOnTop(true, 'pop-up-menu');
    win.webContents.send('overlay-show', payload);
    win.showInactive();
    win.moveTop();
  };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send);
  else send();
}

function hideOverlay() {
  if (overlayWin && !overlayWin.isDestroyed()) overlayWin.hide();
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+P', () => showSearchWindow());
}

function startWatcher() {
  watcher.startWatcher({
    getConfig: () => ({ surfacingEnabled: true }),
    onAppSwitch: (bundleId, appName) => {
      const picked = surface.pickSurfacedNotes({
        bundleId,
        appName,
        db,
        catalog: KNOWN_APPS,
        limit: APP_CONFIG.maxSurfacedNotes,
      });
      if (!picked.appKey || picked.notes.length === 0) return;
      showOverlay(picked.appKey, picked.notes);
    },
  });
}

function notifySearchNotesChanged() {
  if (searchWin && !searchWin.isDestroyed()) {
    searchWin.webContents.send('notes-changed');
  }
}

function registerIpc() {
  ipcMain.handle('capture:save', (_event, text, appKey) => {
    const note = db.createNote(text);
    if (note && appKey) db.linkNoteToApp(note.id, appKey);
    if (note) notifySearchNotesChanged();
    return note;
  });
  ipcMain.handle('search:query', (_event, query) => db.searchNotes(query, 20));
  ipcMain.handle('notes:recent', () => db.listRecent(20));
  ipcMain.handle('note:get', (_event, noteId) => db.getNote(noteId));
  ipcMain.handle('note:update', (_event, noteId, text) => db.updateNote(noteId, text));
  ipcMain.handle('note:delete', (_event, noteId) => {
    const ok = db.deleteNote(noteId);
    if (ok) notifySearchNotesChanged();
    return ok;
  });
  ipcMain.handle('note:delete-many', (_event, noteIds) => {
    const deletedCount = db.deleteNotes(noteIds);
    if (deletedCount > 0) notifySearchNotesChanged();
    return deletedCount;
  });

  ipcMain.handle('links:get', (_event, noteId) => db.getLinksForNote(noteId));
  ipcMain.handle('links:add', (_event, noteId, appKey) => {
    db.linkNoteToApp(noteId, appKey);
    notifySearchNotesChanged();
    return db.getLinksForNote(noteId);
  });
  ipcMain.handle('links:remove', (_event, noteId, appKey) => {
    db.unlinkNoteFromApp(noteId, appKey);
    notifySearchNotesChanged();
    return db.getLinksForNote(noteId);
  });
  ipcMain.handle('apps:list', () => KNOWN_APPS.map((entry) => ({ name: entry.name, bundleId: entry.bundleId })));
  ipcMain.handle('apps:resolve', (_event, raw) => resolveInputToBundleId(raw));
  ipcMain.handle('clipboard:copy', (_event, text) => {
    clipboard.writeText(String(text || ''));
    return true;
  });

  ipcMain.on('window:hide-capture', hideCaptureWindow);
  ipcMain.on('window:hide-search', hideSearchWindow);
  ipcMain.on('window:show-search', (_event, payload) => showSearchWindow(payload || {}));
  ipcMain.on('window:show-capture', showCaptureWindow);

  ipcMain.on('overlay-open-note', (_event, noteId) => {
    hideOverlay();
    showSearchWindow({ openNoteId: noteId });
  });
  ipcMain.on('overlay-snooze', (_event, noteId, appKey, minutes) => {
    db.snoozeNote(noteId, appKey, Number(minutes) || APP_CONFIG.defaultSnoozeMinutes);
    hideOverlay();
  });
  ipcMain.on('overlay-complete', (_event, noteId) => {
    db.completeNote(noteId);
    hideOverlay();
    notifySearchNotesChanged();
  });
  ipcMain.on('overlay-disable', (_event, noteId, appKey) => {
    db.dismissNote(noteId, appKey);
    hideOverlay();
  });
  ipcMain.on('overlay-dismiss-all', hideOverlay);
}

app.whenReady().then(() => {
  createCaptureWindow();
  createSearchWindow();
  registerShortcuts();
  registerIpc();
  startWatcher();
});

app.on('will-quit', () => {
  watcher.stopWatcher();
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (!captureWin || captureWin.isDestroyed()) createCaptureWindow();
  if (!searchWin || searchWin.isDestroyed()) createSearchWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
