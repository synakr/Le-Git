const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { db}= require('./src/db');
const axios = require('axios');

// For AI chatbot
let openai;
try { openai = require('openai'); } catch { openai = null; }

require('dotenv').config();
const apiKey = process.env.API_KEY;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_SECRET;

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  win.loadFile('index.html');
  win.webContents.once('did-finish-load', () => sendAllNodes(win));
}

// --- AI Chatbot IPC Handler ---
ipcMain.handle('ai-chatbot-query', async (event, userMsg) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GEMINI_SECRET;
  if (!GEMINI_API_KEY) return 'AI not available (missing Gemini API key).';
  try {
    // Gemini Flash 2.5 API endpoint
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + GEMINI_API_KEY;
    const payload = {
      contents: [
        { role: 'user', parts: [{ text: userMsg }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    };
    const res = await axios.post(url, payload);
    // Gemini response parsing
    const aiReply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return aiReply ? aiReply.trim() : 'No response from Gemini.';
  } catch (e) {
    return 'Error: ' + (e.response?.data?.error?.message || e.message || 'Unknown error');
  }
});

function sendAllNodes(winOrSender) {
  db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
    if (err) return console.error(err.message);
    const nodes = rows.map(r => ({ ...r, progress: r.progress || 0 }));
    if (winOrSender.webContents) winOrSender.webContents.send('load-nodes', nodes);
    else winOrSender.send('load-nodes', nodes);
  });
}

function extractVideoId(url) {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : url;
}

//newly added
function recalcPlaylistProgress(nodeId, cb) {
  db.get(`SELECT COUNT(*) as total FROM playlist_videos WHERE node_id = ?`, [nodeId], (err, totalRow) => {
    if (err) return cb && cb(err);
    const total = totalRow ? totalRow.total : 0;
    if (total === 0) {
      db.run(`UPDATE nodes SET progress = 0 WHERE id = ?`, [nodeId], cb);
      return;
    }
    db.get(`SELECT COUNT(*) as watched FROM playlist_videos WHERE node_id = ? AND watched = 1`, [nodeId], (err2, watchedRow) => {
      if (err2) return cb && cb(err2);
      const watched = watchedRow ? watchedRow.watched : 0;
      const pct = Math.round((watched / total) * 100);
      db.run(`UPDATE nodes SET progress = ? WHERE id = ?`, [pct, nodeId], cb);
    });
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
// === Node creation ===
ipcMain.on('create-node', (event, data) => {
  db.get(`SELECT MAX(order_index) as maxIndex FROM nodes`, [], (err, row) => {
    if (err) return console.error(err.message);
    const nextIndex = row?.maxIndex != null ? row.maxIndex + 1 : 0;

    db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp, order_index) 
            VALUES (?, ?, 0, '', '', ?)`,
      [data.name, data.type, nextIndex], function(err) {
        if (err) return console.error(err.message);
        const nodeId = this.lastID;

        if (data.type === 'playlist' && data.playlistUrl) {
          const match = data.playlistUrl.match(/[?&]list=([^&]+)/);
          if (match) return fetchPlaylistVideos(match[1], nodeId, () => sendAllNodes(event.sender));
        }
        sendAllNodes(event.sender);
      });
  });
});

// === Playlist fetch ===
async function fetchPlaylistVideos(playlistId, nodeId, cb) {
  const API_KEY = apiKey;
  let pageToken = "", videos = [];

  try {
    do {
      const res = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
        params: { part: "snippet", maxResults: 50, playlistId, key: API_KEY, pageToken }
      });
      res.data.items.forEach(it => {
        if (it.snippet?.resourceId.kind === "youtube#video") {
          videos.push({ videoId: it.snippet.resourceId.videoId, title: it.snippet.title });
        }
      });
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    db.run(`DELETE FROM playlist_videos WHERE node_id = ?`, [nodeId], () => {
      const stmt = db.prepare(`INSERT INTO playlist_videos (node_id, video_id, title) VALUES (?, ?, ?)`);
      videos.forEach(v => stmt.run([nodeId, v.videoId, v.title]));
      stmt.finalize(cb);
    });
  } catch (err) {
    console.error("YouTube API error:", err.message);
    cb && cb();
  }
}

ipcMain.on('continue-playlist-video', (event, data) => {
  event.sender.send('play-video', { videoId: data.videoId });
});

ipcMain.on('toggle-playlist-watched', (event, data) => {
  db.run(`UPDATE playlist_videos SET watched = ? WHERE id = ?`, [data.watched, data.videoId], err => {
    if (err) return console.error(err.message);
    // No UI reload here; frontend updates progress in real-time
    // Streak tracking
    const date = new Date().toISOString().slice(0, 10);
    require('./src/db').addStreak(date, data.nodeId, data.watched ? 1 : -1);
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
  event.sender.send('play-video', { videoId: extractVideoId(data.url) });
});


// --- TOGGLE VIDEO WATCHED ---
ipcMain.on('toggle-video-watched', (event, data) => {
  db.run(`UPDATE custom_videos SET watched = ? WHERE id = ?`, [data.watched, data.videoId], function(err) {
    if (err) return console.error(err.message);
    // recalc node progress, but do NOT reload UI
    recalcNodeProgress(data.nodeId, () => {
      // No sendAllNodes here; frontend updates progress in real-time
    });
    // Streak tracking
    const date = new Date().toISOString().slice(0, 10);
    require('./src/db').addStreak(date, data.nodeId, data.watched ? 1 : -1);
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

//api helper
// --- NEW: Fetch playlist videos using YouTube API ---
// async function fetchPlaylistVideos(playlistId, nodeId, cb) {
//   const API_KEY = "AIzaSyDiUPDi9hqCsyC7-985gBHNGXxD7_cggDI"; // replace with your key
//   let pageToken = "";
//   let videos = [];

//   try {
//     do {
//       const res = await axios.get("https://www.googleapis.com/youtube/v3/playlistItems", {
//         params: {
//           part: "snippet",
//           maxResults: 50,
//           playlistId,
//           key: API_KEY,
//           pageToken
//         }
//       });

//       const items = res.data.items;
//       items.forEach(it => {
//         if (it.snippet && it.snippet.resourceId.kind === "youtube#video") {
//           videos.push({
//             videoId: it.snippet.resourceId.videoId,
//             title: it.snippet.title
//           });
//         }
//       });

//       pageToken = res.data.nextPageToken;
//     } while (pageToken);

//     // Insert into DB
//     const stmt = db.prepare(`INSERT INTO playlist_videos (node_id, video_id, title) VALUES (?, ?, ?)`);
//     videos.forEach(v => stmt.run([nodeId, v.videoId, v.title]));
//     stmt.finalize();

//     cb && cb();
//   } catch (err) {
//     console.error("YouTube API error:", err.message);
//     cb && cb();
//   }
// }

// --- Get playlist videos ---
ipcMain.handle('get-playlist-videos', (event, nodeId) => {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM playlist_videos WHERE node_id = ? ORDER BY id ASC`, [nodeId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
});

// --- Toggle watched ---
// ipcMain.on('toggle-playlist-watched', (event, data) => {
//   db.run(`UPDATE playlist_videos SET watched = ? WHERE id = ?`, [data.watched, data.videoId], function(err) {
//     if (err) return console.error(err.message);
//     // Optional: recalc progress
//     recalcPlaylistProgress(data.nodeId, () => {
//       sendAllNodes(event.sender);
//     });
//   });
// });

// --- Streak IPC ---
ipcMain.handle('get-streaks', (event, { nodeId, days }) => {
  return new Promise((resolve) => {
    require('./src/db').getStreaks(nodeId, days, (rows) => {
      resolve(rows);
    });
  });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
