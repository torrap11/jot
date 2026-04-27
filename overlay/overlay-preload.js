'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
  onShow: (cb) =>
    ipcRenderer.on('overlay-show', (_e, payload) => {
      cb(payload || {});
    }),
  onDismiss:  (cb) => ipcRenderer.on('overlay-dismiss', () => cb()),
  snooze:     (noteId, appKey, minutes) => ipcRenderer.send('overlay-snooze', noteId, appKey, minutes),
  complete:   (noteId)                   => ipcRenderer.send('overlay-complete', noteId),
  disable:    (noteId, appKey)          => ipcRenderer.send('overlay-disable', noteId, appKey),
  openNote:   (noteId)          => ipcRenderer.send('overlay-open-note', noteId),
  dismissAll: ()                => ipcRenderer.send('overlay-dismiss-all'),
});
