const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('legit.db');

// Initialize tables
db.serialize(() => {
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
  getNodes
};
