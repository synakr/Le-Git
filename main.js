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

  // When UI loads, send nodes ordered by order_index
  win.webContents.once('did-finish-load', () => {
    sendAllNodes(win);
  });
}

function sendAllNodes(winOrSender) {
  const sendFn = (rows) => {
    // ensure progress values are integers
    const nodes = rows.map(r => ({ ...r, progress: r.progress || 0 }));
    // if winOrSender is an event.sender, it has send; if BrowserWindow use webContents.send
    if (winOrSender && typeof winOrSender.webContents !== 'undefined') {
      winOrSender.webContents.send('load-nodes', nodes);
    } else if (winOrSender && typeof winOrSender.send === 'function') {
      winOrSender.send('load-nodes', nodes);
    }
  };

  db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
    if (err) return console.error(err.message);
    sendFn(rows);
  });
}

// helper: recalc progress for a custom node (percentage of watched videos)
function recalcNodeProgress(nodeId, cb) {
  db.get(`SELECT COUNT(*) as total FROM custom_videos WHERE node_id = ?`, [nodeId], (err, totalRow) => {
    if (err) return cb && cb(err);
    const total = totalRow ? totalRow.total : 0;
    if (total === 0) {
      // no videos -> set progress 0
      db.run(`UPDATE nodes SET progress = 0 WHERE id = ?`, [nodeId], function(e) {
        if (e) console.error(e.message);
        cb && cb(null);
      });
      return;
    }
    db.get(`SELECT COUNT(*) as watched FROM custom_videos WHERE node_id = ? AND watched = 1`, [nodeId], (err2, watchedRow) => {
      if (err2) return cb && cb(err2);
      const watched = watchedRow ? watchedRow.watched : 0;
      const pct = Math.round((watched / total) * 100);
      db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [pct, nodeId], function(e) {
        if (e) console.error(e.message);
        cb && cb(null);
      });
    });
  });
}

// --- CREATE NODE ---
ipcMain.on('create-node', (event, data) => {
  db.get(`SELECT MAX(order_index) as maxIndex FROM nodes`, [], (err, row) => {
    if (err) return console.error(err.message);
    const nextIndex = row && row.maxIndex != null ? row.maxIndex + 1 : 0;
    db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name, data.type, 0, '', '', nextIndex], function(err) {
        if (err) return console.error(err.message);
        sendAllNodes(event.sender);
      });
  });
});

// --- UPDATE PROGRESS (non-custom nodes) ---
ipcMain.on('update-progress', (event, data) => {
  db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [data.progress, data.id], function(err) {
    if (err) return console.error(err.message);
    sendAllNodes(event.sender);
  });
});

// --- MARK UP TO (nodes) ---
ipcMain.on('mark-up-to', (event, data) => {
  // order by order_index
  db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
    if (err) return console.error(err.message);
    rows.forEach((node, index) => {
      const progress = index + 1 <= data.upTo ? 100 : 0;
      db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [progress, node.id]);
    });
    sendAllNodes(event.sender);
  });
});

// --- CAPTURE VIDEO (creates new custom node with last_video) ---
ipcMain.on('capture-video-ui', (event, data) => {
  db.get(`SELECT MAX(order_index) as maxIndex FROM nodes`, [], (err, row) => {
    if (err) return console.error(err.message);
    const nextIndex = row && row.maxIndex != null ? row.maxIndex + 1 : 0;
    db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp, order_index) VALUES (?, ?, ?, ?, ?, ?)`,
      ['Captured Video', 'custom', 0, data.url, data.ts, nextIndex], function(err){
        if (err) return console.error(err.message);
        sendAllNodes(event.sender);
      });
  });
});

// --- CONTINUE NODE (open last_video at timestamp) ---
ipcMain.on('continue-node', (event, data) => {
  db.get(`SELECT last_video, last_timestamp FROM nodes WHERE id = ?`, [data.id], (err, row) => {
    if (err) return console.error(err.message);
    if (row && row.last_video) {
      const parts = (row.last_timestamp || '00:00').split(':');
      let seconds = 0;
      if (parts.length === 2) seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      else seconds = parseInt(parts[0]);
      const urlWithTime = `${row.last_video}?t=${seconds}s`;
      shell.openExternal(urlWithTime);
    } else {
      console.log('No last video saved for this node.');
    }
  });
});

// --- SAVE NOTES ---
ipcMain.on('save-notes', (event, data) => {
  db.run(`UPDATE nodes SET notes = ? WHERE id = ?`, [data.notes, data.id], function(err) {
    if (err) return console.error(err.message);
  });
});

// --- DELETE NODE (and its custom_videos) ---
ipcMain.on('delete-node', (event, data) => {
  const nodeId = data.id;
  db.run(`DELETE FROM custom_videos WHERE node_id = ?`, [nodeId], function(err) {
    if (err) return console.error(err.message);
    db.run(`DELETE FROM nodes WHERE id = ?`, [nodeId], function(err2) {
      if (err2) return console.error(err2.message);
      sendAllNodes(event.sender);
    });
  });
});

// --- MOVE NODE UP/DOWN ---
ipcMain.on('move-node', (event, data) => {
  db.get(`SELECT * FROM nodes WHERE id = ?`, [data.id], (err, node) => {
    if (err || !node) return;
    const currentIndex = node.order_index;
    const swapIndex = data.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    db.get(`SELECT * FROM nodes WHERE order_index = ?`, [swapIndex], (err, swapNode) => {
      if (swapNode) {
        db.run(`UPDATE nodes SET order_index = ? WHERE id = ?`, [swapIndex, node.id]);
        db.run(`UPDATE nodes SET order_index = ? WHERE id = ?`, [currentIndex, swapNode.id], () => {
          db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
            if (err) return console.error(err.message);
            // prefer send to the original sender
            event.sender.send('load-nodes', rows);
          });
        });
      }
    });
  });
});

// --- ADD VIDEO TO CUSTOM NODE ---
ipcMain.on('add-video-to-node', (event, data) => {
  db.run(`INSERT INTO custom_videos (node_id, url, timestamp, watched) VALUES (?, ?, ?, 0)`,
    [data.id, data.url, data.ts], function(err) {
      if (err) return console.error(err.message);
      // recalc progress for this node
      recalcNodeProgress(data.id, () => {
        sendAllNodes(event.sender);
      });
    });
});

// --- GET VIDEOS FOR NODE ---
ipcMain.handle('get-videos', (event, nodeId) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM custom_videos WHERE node_id = ? ORDER BY id ASC`, [nodeId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// --- CONTINUE A SINGLE VIDEO ---
ipcMain.on('continue-video', (event, data) => {
  const parts = (data.ts || '00:00').split(':');
  let seconds = 0;
  if (parts.length === 2) seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  else seconds = parseInt(parts[0]);
  const urlWithTime = `${data.url}?t=${seconds}s`;
  shell.openExternal(urlWithTime);
});

// --- TOGGLE VIDEO WATCHED ---
ipcMain.on('toggle-video-watched', (event, data) => {
  db.run(`UPDATE custom_videos SET watched = ? WHERE id = ?`, [data.watched, data.videoId], function(err) {
    if (err) return console.error(err.message);
    // recalc node progress
    recalcNodeProgress(data.nodeId, () => {
      sendAllNodes(event.sender);
    });
  });
});

// --- DELETE CUSTOM VIDEO ---
ipcMain.on('delete-custom-video', (event, data) => {
  db.run(`DELETE FROM custom_videos WHERE id = ?`, [data.videoId], function(err) {
    if (err) return console.error(err.message);
    recalcNodeProgress(data.nodeId, () => {
      sendAllNodes(event.sender);
    });
  });
});

// --- MARK ALL VIDEOS WATCHED/UNWATCHED for a node ---
ipcMain.on('mark-all-videos', (event, data) => {
  // data: { id: nodeId, watched: 1 or 0 } if watched omitted assume 1
  const watchedFlag = (typeof data.watched !== 'undefined') ? data.watched : 1;
  db.run(`UPDATE custom_videos SET watched = ? WHERE node_id = ?`, [watchedFlag, data.id], function(err) {
    if (err) return console.error(err.message);
    recalcNodeProgress(data.id, () => {
      sendAllNodes(event.sender);
    });
  });
});



app.whenReady().then(createWindow);

