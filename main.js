const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

let win;

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width: 320,
    height: 260,
    x: screenWidth - 340,
    y: 80,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    show: false,
    transparent: false,
    backgroundColor: '#fef9c3',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('closed', () => {
    win = null;
  });
}

function toggleWindow() {
  if (!win) {
    createWindow();
    win.show();
    return;
  }
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}

app.whenReady().then(() => {
  const db = require('./database');

  createWindow();

  globalShortcut.register('Control+Option+Command+J', toggleWindow);

  ipcMain.handle('get-notes', () => db.getAllNotes());
  ipcMain.handle('create-note', (_e, content) => db.createNote(content));
  ipcMain.handle('update-note', (_e, id, content) => db.updateNote(id, content));
  ipcMain.handle('delete-note', (_e, id) => db.deleteNote(id));
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

if (app.dock) {
  app.dock.hide();
}
