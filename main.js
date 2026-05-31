const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');

let store;
let pinned = true;

const DEFAULT_WIDTH = 325;
const DEFAULT_HEIGHT = 325;

async function initStore() {
  const Store = (await import('electron-store')).default;
  store = new Store({
    defaults: { noteIds: [], notes: {} },
  });
}

function loadNote(noteId) {
  return store.get(`notes.${noteId}`, '');
}

function saveNote(noteId, text) {
  store.set(`notes.${noteId}`, text);
  const ids = store.get('noteIds', []);
  if (!ids.includes(noteId)) {
    store.set('noteIds', [...ids, noteId]);
  }
}

function getSavedNoteIds() {
  return store.get('noteIds', []);
}

function loadNoteSize(noteId) {
  return store.get(`sizes.${noteId}`, {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
}

function saveNoteSize(noteId, width, height) {
  store.set(`sizes.${noteId}`, { width, height });
}

function attachWindowSizePersistence(win, noteId) {
  let resizeTimeout;

  const persistSize = () => {
    if (win.isDestroyed()) return;
    const [width, height] = win.getSize();
    saveNoteSize(noteId, width, height);
  };

  win.on('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(persistSize, 200);
  });

  win.on('close', persistSize);
}

function createWindow(noteId = crypto.randomUUID()) {
  const size = loadNoteSize(noteId);

  const win = new BrowserWindow({
    width: size.width,
    height: size.height,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.noteId = noteId;

  attachWindowSizePersistence(win, noteId);

  if (pinned) {
    win.setAlwaysOnTop(true);
  }

  win.loadFile(path.join(__dirname, 'index.html'), {
    query: { id: noteId },
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('note:load', loadNote(noteId));
  });

  return win;
}

function setAllWindowsPinned(value) {
  pinned = value;
  BrowserWindow.getAllWindows().forEach((win) => {
    win.setAlwaysOnTop(pinned);
  });
}

function requestSaveFocusedWindow() {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.send('note:save-request');
  }
}

function buildMenu() {
  const template = [
    {
      label: 'Menu',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow(),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => requestSaveFocusedWindow(),
        },
        {
          label: 'Pin',
          type: 'checkbox',
          checked: pinned,
          click: (menuItem) => {
            setAllWindowsPinned(menuItem.checked);
            Menu.setApplicationMenu(buildMenu());
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

app.whenReady().then(async () => {
  await initStore();

  ipcMain.handle('note:save', (_event, { id, text }) => {
    saveNote(id, text);
  });

  Menu.setApplicationMenu(buildMenu());

  const ids = getSavedNoteIds();
  if (ids.length === 0) {
    createWindow();
  } else {
    ids.forEach((id) => createWindow(id));
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
