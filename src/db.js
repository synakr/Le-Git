const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('legit.db');

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

  // Ensure order_index for existing rows (only set if null/0 ambiguous - keep simple)
  db.all(`SELECT * FROM nodes ORDER BY id ASC`, [], (err, rows) => {
    if (err) return console.error(err.message);
    rows.forEach((r, i) => {
      db.run(`UPDATE nodes SET order_index = ? WHERE id = ?`, [i, r.id]);
    });
  });

  // custom_videos: store multiple videos for a custom node
  db.run(`CREATE TABLE IF NOT EXISTS custom_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER,
    url TEXT,
    timestamp TEXT,
    watched INTEGER DEFAULT 0
  )`);
});

module.exports = db;
