const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./src/db');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');

  win.webContents.once('did-finish-load', () => {
    db.all(`SELECT * FROM nodes`, [], (err, rows) => {
      if (err) return console.error(err.message);
      win.webContents.send('load-nodes', rows);
    });
  });
}

//ipc handler
ipcMain.on('create-node', (event, data) => {
  db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp) VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.type, 0, '', ''], function(err) {
      if (err) return console.error(err.message);
      // reload nodes
      db.all(`SELECT * FROM nodes`, [], (err, rows) => {
        if (err) return console.error(err.message);
        event.sender.send('load-nodes', rows);
      });
    });
});

//progress updation
ipcMain.on('update-progress', (event, data) => {
  db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [data.progress, data.id], function(err) {
    if (err) return console.error(err.message);
    db.all(`SELECT * FROM nodes`, [], (err, rows) => {
      if (err) return console.error(err.message);
      event.sender.send('load-nodes', rows);
    });
  });
});

//marking
ipcMain.on('mark-up-to', (event, data) => {
  db.all(`SELECT * FROM nodes ORDER BY id ASC`, [], (err, rows) => {
    if (err) return console.error(err.message);
    rows.forEach((node, index) => {
      const progress = index + 1 <= data.upTo ? 100 : 0;
      db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [progress, node.id]);
    });
    db.all(`SELECT * FROM nodes`, [], (err, rows) => {
      if (err) return console.error(err.message);
      event.sender.send('load-nodes', rows);
    });
  });
});

//capture
ipcMain.on('capture-video', (event) => {
  // Placeholder example: insert dummy video
  db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp) VALUES (?, ?, ?, ?, ?)`,
    ['Captured Video', 'custom', 0, 'https://youtu.be/dQw4w9WgXcQ', '00:00'], function(err) {
      if (err) return console.error(err.message);
      db.all(`SELECT * FROM nodes`, [], (err, rows) => {
        if (err) return console.error(err.message);
        event.sender.send('load-nodes', rows);
      });
    });
});

//save notes
ipcMain.on('save-notes', (event, data) => {
  db.run(`ALTER TABLE nodes ADD COLUMN IF NOT EXISTS notes TEXT`, [], () => {
    db.run(`UPDATE nodes SET notes = ? WHERE id = ?`, [data.notes, data.id], function(err) {
      if (err) return console.error(err.message);
    });
  });
});

//delete node
ipcMain.on('delete-node', (event, data) => {
  db.run(`DELETE FROM nodes WHERE id = ?`, [data.id], function(err) {
    if (err) return console.error(err.message);
    db.all(`SELECT * FROM nodes`, [], (err, rows) => {
      if (err) return console.error(err.message);
      event.sender.send('load-nodes', rows);
    });
  });
});



app.whenReady().then(createWindow);