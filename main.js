const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let pinned = true;

function createWindow(htmlFile = 'index.html') {
  const win = new BrowserWindow({
    width: 300,
    height: 300,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (pinned) {
    win.setAlwaysOnTop(true);
  }

  win.loadFile(path.join(__dirname, htmlFile));
  return win;
}

function setAllWindowsPinned(value) {
  pinned = value;
  BrowserWindow.getAllWindows().forEach((win) => {
    win.setAlwaysOnTop(pinned);
  });
}

function buildMenu() {
  const template = [
    {
      label: 'Menu',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow('note.html'),
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

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildMenu());
  createWindow();
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