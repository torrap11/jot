const { app, BrowserWindow, globalShortcut, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const keybinds = require('./keybinds');

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
  const llm = require('./llm');
  const executor = require('./intelligence/executor');

  createWindow();

  globalShortcut.register('Command+E', toggleWindow);

  ipcMain.handle('get-notes', () => db.getAllNotes());
  ipcMain.handle('create-note', (_e, content) => db.createNote(content));
  ipcMain.handle('update-note', (_e, id, content) => db.updateNote(id, content));
  ipcMain.handle('delete-note', (_e, id) => db.deleteNote(id));
  ipcMain.handle('restore-note', (_e, note) => db.restoreNote(note));
  ipcMain.handle('create-folder',       (_e, name, description) => db.createFolder(name, description));
  ipcMain.handle('update-folder',       (_e, id, name, description) => db.updateFolder(id, name, description));
  ipcMain.handle('get-folders',         ()                     => db.getAllFolders());
  ipcMain.handle('update-note-folder',  (_e, noteId, folderId) => db.updateNoteFolder(noteId, folderId));
  ipcMain.handle('get-notes-by-folder', (_e, folderId)         => db.getNotesByFolder(folderId));
  const AGENT_SYSTEM_PROMPT =
    'You are Easy Jot Agent, an AI assistant embedded in a sticky-note app. ' +
    'Help the user understand, search, and act on their notes. ' +
    'Be concise and actionable. When referencing a note, use [Note ID] format.';

  ipcMain.handle('intelligence-query', async (_e, { userMessage, notes }) => {
    try {
      const response = await llm.callLLM(AGENT_SYSTEM_PROMPT, userMessage, notes);
      return { response };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('intelligence-execute', async (_e, actions) => {
    return executor.executeActions(actions, db);
  });

  ipcMain.handle('intelligence-query-structured', async (_e, { userMessage, notes }) => {
    try {
      const actions = await llm.callLLMWithStructuredOutput(userMessage, notes);
      return { actions };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('intelligence-query-help', async (_e, { userMessage }) => {
    try {
      const shortcuts = [...keybinds.global, ...keybinds.inApp]
        .map(s => `- ${s.keys}: ${s.action}`)
        .join('\n');
      const systemPrompt =
        AGENT_SYSTEM_PROMPT +
        ' You can also answer questions about keyboard shortcuts. Here are the shortcuts:\n' +
        shortcuts;
      const response = await llm.callLLM(systemPrompt, userMessage, []);
      return { response };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('resize-window', (_e, panelOpen) => {
    if (!win) return;
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    if (panelOpen) {
      win.setBounds({ x: screenWidth - 620, width: 600 }, true);
    } else {
      win.setBounds({ x: screenWidth - 340, width: 320 }, true);
    }
  });
  ipcMain.handle('create-note-from-image', async () => {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/png';
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64}`;
    return db.createNote(dataUrl);
  });
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
