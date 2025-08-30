const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const db = require('./src/db');

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  win.loadFile('index.html');

  win.webContents.once('did-finish-load', () => {
    db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
      if(err) return console.error(err.message);
      win.webContents.send('load-nodes', rows);
    });
  });
}

// --- CREATE NODE ---
ipcMain.on('create-node', (event, data) => {
  db.get(`SELECT MAX(order_index) as maxIndex FROM nodes`, [], (err, row) => {
    if(err) return console.error(err.message);
    const nextIndex = row && row.maxIndex != null ? row.maxIndex + 1 : 0;

    db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name, data.type, 0, '', '', nextIndex], function(err) {
        if(err) return console.error(err.message);
        db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
          if(err) return console.error(err.message);
          event.sender.send('load-nodes', rows);
        });
      });
  });
});

// --- UPDATE PROGRESS ---
ipcMain.on('update-progress', (event, data) => {
  db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [data.progress, data.id], function(err) {
    if(err) return console.error(err.message);
    db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
      if(err) return console.error(err.message);
      event.sender.send('load-nodes', rows);
    });
  });
});

// --- MARK UP TO ---
ipcMain.on('mark-up-to', (event, data) => {
  db.all(`SELECT * FROM nodes ORDER BY id ASC`, [], (err, rows) => {
    if(err) return console.error(err.message);
    rows.forEach((node,index)=>{
      const progress = index+1 <= data.upTo ? 100 : 0;
      db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [progress, node.id]);
    });
    db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
      if(err) return console.error(err.message);
      event.sender.send('load-nodes', rows);
    });
  });
});

// --- CAPTURE VIDEO ---
ipcMain.on('capture-video-ui', (event, data) => {
  db.get(`SELECT MAX(order_index) as maxIndex FROM nodes`, [], (err, row) => {
    if(err) return console.error(err.message);
    const nextIndex = row && row.maxIndex != null ? row.maxIndex + 1 : 0;

    db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Captured Video', 'custom', 0, data.url, data.ts, nextIndex], function(err){
        if(err) return console.error(err.message);
        db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows)=>{
          if(err) return console.error(err.message);
          event.sender.send('load-nodes', rows);
        });
      });
  });
});

// --- CONTINUE VIDEO ---
ipcMain.on('continue-node', (event, data)=>{
  db.get(`SELECT last_video, last_timestamp FROM nodes WHERE id = ?`, [data.id], (err,row)=>{
    if(err) return console.error(err.message);
    if(row && row.last_video){
      const parts = row.last_timestamp.split(':');
      let seconds = parts.length === 2 ? parseInt(parts[0])*60 + parseInt(parts[1]) : parseInt(parts[0]);
      const urlWithTime = `${row.last_video}?t=${seconds}s`;
      shell.openExternal(urlWithTime);
    } else {
      console.log('No last video saved for this node.');
    }
  });
});

// --- SAVE NOTES ---
ipcMain.on('save-notes', (event, data)=>{
  db.run(`UPDATE nodes SET notes = ? WHERE id = ?`, [data.notes, data.id], function(err){
    if(err) return console.error(err.message);
  });
});

// --- DELETE NODE ---
ipcMain.on('delete-node', (event,data)=>{
  db.run(`DELETE FROM nodes WHERE id = ?`, [data.id], function(err){
    if(err) return console.error(err.message);
    db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err,rows)=>{
      if(err) return console.error(err.message);
      event.sender.send('load-nodes', rows);
    });
  });
});

// --- MOVE NODE UP/DOWN ---
ipcMain.on('move-node', (event, data)=>{
  db.get(`SELECT * FROM nodes WHERE id = ?`, [data.id], (err,node)=>{
    if(err || !node) return;
    const currentIndex = node.order_index;
    const swapIndex = data.direction==='up'? currentIndex-1 : currentIndex+1;
    db.get(`SELECT * FROM nodes WHERE order_index = ?`, [swapIndex], (err,swapNode)=>{
      if(swapNode){
        db.run(`UPDATE nodes SET order_index = ? WHERE id = ?`, [swapIndex, node.id]);
        db.run(`UPDATE nodes SET order_index = ? WHERE id = ?`, [currentIndex, swapNode.id], ()=>{
          db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err,rows)=>{
            if(err) return;
            event.sender.send('load-nodes', rows);
          });
        });
      }
    });
  });
});

// For custom video group
ipcMain.on('add-video-to-node', (event, data) => {
  db.run(`INSERT INTO custom_videos (node_id, url, timestamp) VALUES (?, ?, ?)`,
    [data.id, data.url, data.ts], function(err){
      if(err) return console.error(err.message);
      // reload nodes (later can fetch video list)
      db.all(`SELECT * FROM nodes`, [], (err, rows) => {
        if(err) return;
        event.sender.send('load-nodes', rows);
      });
    });
});

ipcMain.handle('get-videos', (event, nodeId) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM custom_videos WHERE node_id = ?`, [nodeId], (err, rows) => {
      if(err) reject(err);
      else resolve(rows);
    });
  });
});

ipcMain.on('continue-video', (event, data) => {
  const parts = data.ts.split(':');
  let seconds = 0;
  if(parts.length === 2) seconds = parseInt(parts[0])*60 + parseInt(parts[1]);
  else seconds = parseInt(parts[0]);
  const urlWithTime = `${data.url}?t=${seconds}s`;
  shell.openExternal(urlWithTime);
});



app.whenReady().then(createWindow);
