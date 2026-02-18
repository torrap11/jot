const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getNotes: () => ipcRenderer.invoke('get-notes'),
  createNote: (content) => ipcRenderer.invoke('create-note', content),
  updateNote: (id, content) => ipcRenderer.invoke('update-note', id, content),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
});
