'use strict';

/** Preload for capture + search windows (contextBridge API `window.mvp`). */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mvp', {
  saveCapture: (text, appKey) => ipcRenderer.invoke('capture:save', text, appKey),
  queryNotes: (query) => ipcRenderer.invoke('search:query', query),
  recentNotes: () => ipcRenderer.invoke('notes:recent'),
  getNote: (noteId) => ipcRenderer.invoke('note:get', noteId),
  updateNote: (noteId, text) => ipcRenderer.invoke('note:update', noteId, text),
  deleteNote: (noteId) => ipcRenderer.invoke('note:delete', noteId),
  deleteNotes: (noteIds) => ipcRenderer.invoke('note:delete-many', noteIds),
  getLinks: (noteId) => ipcRenderer.invoke('links:get', noteId),
  addLink: (noteId, appKey) => ipcRenderer.invoke('links:add', noteId, appKey),
  removeLink: (noteId, appKey) => ipcRenderer.invoke('links:remove', noteId, appKey),
  listApps: () => ipcRenderer.invoke('apps:list'),
  resolveAppKey: (raw) => ipcRenderer.invoke('apps:resolve', raw),
  copyText: (text) => ipcRenderer.invoke('clipboard:copy', text),
  hideCapture: () => ipcRenderer.send('window:hide-capture'),
  hideSearch: () => ipcRenderer.send('window:hide-search'),
  openSearch: (payload) => ipcRenderer.send('window:show-search', payload),
  openCapture: () => ipcRenderer.send('window:show-capture'),
  onCaptureFocus: (cb) => ipcRenderer.on('capture:focus', () => cb()),
  onSearchFocus: (cb) => ipcRenderer.on('search:focus', (_event, payload) => cb(payload || {})),
  onNotesChanged: (cb) => ipcRenderer.on('notes-changed', () => cb()),
});
