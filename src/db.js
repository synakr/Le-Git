const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('legit.db');

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS streak (
    date TEXT,
    node_id INTEGER,
    count INTEGER,
    PRIMARY KEY (date, node_id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    progress INTEGER,
    last_video TEXT,
    last_timestamp TEXT,
    notes TEXT,
    order_index INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS custom_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER,
    url TEXT,
    timestamp TEXT,
    watched INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS playlist_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER,
    video_id TEXT,
    title TEXT,
    watched INTEGER DEFAULT 0
  )`);

  // Ensure order_index values for existing rows
  db.all(`SELECT * FROM nodes ORDER BY id ASC`, [], (err, rows) => {
    if (err) return console.error(err.message);
    rows.forEach((r, i) => {
      db.run(`UPDATE nodes SET order_index = ? WHERE id = ?`, [i, r.id]);
    });
  });
});

// --- Helper functions ---

// Streak helpers
function addStreak(date, nodeId, delta) {
  if (delta <= 0) return; // Do not insert or update for non-positive delta
  db.get(`SELECT count FROM streak WHERE date = ? AND node_id = ?`, [date, nodeId], (err, row) => {
    if (row) {
      db.run(`UPDATE streak SET count = count + ? WHERE date = ? AND node_id = ?`, [delta, date, nodeId]);
    } else {
      db.run(`INSERT OR IGNORE INTO streak (date, node_id, count) VALUES (?, ?, ?)`, [date, nodeId, delta]);
    }
  });
  // Also update general streak (nodeId = 0)
  if (nodeId !== 0) {
    db.get(`SELECT count FROM streak WHERE date = ? AND node_id = 0`, [date], (err, row) => {
      if (row) {
        db.run(`UPDATE streak SET count = count + ? WHERE date = ? AND node_id = 0`, [delta, date]);
      } else {
        db.run(`INSERT OR IGNORE INTO streak (date, node_id, count) VALUES (?, 0, ?)`, [date, delta]);
      }
    });
  }
}

function getStreaks(nodeId, days, cb) {
  // nodeId: 0 for general, else specific node
  db.all(`SELECT date, count FROM streak WHERE node_id = ? ORDER BY date DESC LIMIT ?`, [nodeId, days], (err, rows) => {
    if (err) return cb([]);
    cb(rows);
  });
}

function insertPlaylistVideos(nodeId, videos, cb) {
  db.serialize(() => {
    db.run(`DELETE FROM playlist_videos WHERE node_id = ?`, [nodeId], (err) => {
      if (err) return console.error(err.message);
      const stmt = db.prepare(`INSERT INTO playlist_videos (node_id, video_id, title) VALUES (?, ?, ?)`);
      videos.forEach(v => stmt.run([nodeId, v.videoId, v.title]));
      stmt.finalize();
      cb && cb();
    });
  });
}

function addNode(node, cb) {
  const { name, type, progress = 0, last_video = null, last_timestamp = null, notes = null } = node;
  db.run(
    `INSERT INTO nodes (name, type, progress, last_video, last_timestamp, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, type, progress, last_video, last_timestamp, notes],
    function (err) {
      if (err) return console.error(err.message);
      cb && cb(this.lastID);
    }
  );
}

function getNodes(cb) {
  db.all(`SELECT * FROM nodes ORDER BY order_index ASC`, [], (err, rows) => {
    if (err) return console.error(err.message);
    cb && cb(rows);
  });
}

module.exports = {
  db,
  insertPlaylistVideos,
  addNode,
  getNodes,
  addStreak,
  getStreaks
};
