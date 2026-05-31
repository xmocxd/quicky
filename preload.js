const { contextBridge, ipcRenderer } = require('electron');

function getNoteId() {
  return new URLSearchParams(window.location.search).get('id');
}

contextBridge.exposeInMainWorld('api', {
  getNoteId,
  onLoadNote: (callback) => {
    ipcRenderer.on('note:load', (_event, text) => callback(text));
  },
  onSaveRequest: (callback) => {
    ipcRenderer.on('note:save-request', () => callback());
  },
  saveNote: (text) => ipcRenderer.invoke('note:save', { id: getNoteId(), text }),
});
