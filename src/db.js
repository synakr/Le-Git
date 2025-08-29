const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('legit.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    progress INTEGER,
    last_video TEXT,
    last_timestamp TEXT
  )`);
});

module.exports = db;

// existing code above

// Test insert + fetch
db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp) 
        VALUES (?, ?, ?, ?, ?)`, 
        ["Test Node", "playlist", 0, "none", "00:00"], 
        function(err) {
  if (err) return console.error(err.message);
  console.log("Inserted a test node with ID:", this.lastID);

  db.all(`SELECT * FROM nodes`, (err, rows) => {
    if (err) return console.error(err.message);
    console.log("Current nodes:", rows);
  });
});

// Test insert
db.run(`INSERT INTO nodes (name, type, progress, last_video, last_timestamp) VALUES (?, ?, ?, ?, ?)`,
  ['Test Node', 'playlist', 0, '', ''], function(err) {
    if (err) return console.error(err.message);
    console.log(`Inserted node with ID ${this.lastID}`);
  });

// Test fetch
db.all(`SELECT * FROM nodes`, [], (err, rows) => {
  if (err) return console.error(err.message);
  console.log('All nodes:', rows);
});
