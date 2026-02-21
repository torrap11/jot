const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getNotes: () => ipcRenderer.invoke('get-notes'),
  createNote: (content) => ipcRenderer.invoke('create-note', content),
  createNoteFromImage: () => ipcRenderer.invoke('create-note-from-image'),
  updateNote: (id, content) => ipcRenderer.invoke('update-note', id, content),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
  restoreNote: (note) => ipcRenderer.invoke('restore-note', note),
  resizeWindow:     (panelOpen)           => ipcRenderer.invoke('resize-window', panelOpen),
  createFolder:     (name, description)  => ipcRenderer.invoke('create-folder', name, description),
  updateFolder:     (id, name, description) => ipcRenderer.invoke('update-folder', id, name, description),
  getFolders:       ()                   => ipcRenderer.invoke('get-folders'),
  updateNoteFolder: (noteId, folderId)   => ipcRenderer.invoke('update-note-folder', noteId, folderId),
  getNotesByFolder:   (folderId)           => ipcRenderer.invoke('get-notes-by-folder', folderId),
  intelligenceQuery:           (userMessage, notes) => ipcRenderer.invoke('intelligence-query', { userMessage, notes }),
  intelligenceQueryStructured: (userMessage, notes) => ipcRenderer.invoke('intelligence-query-structured', { userMessage, notes }),
  intelligenceExecute:         (actions)            => ipcRenderer.invoke('intelligence-execute', actions),
  intelligenceQueryHelp:       (userMessage)        => ipcRenderer.invoke('intelligence-query-help', { userMessage }),
});
