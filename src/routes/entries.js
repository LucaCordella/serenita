// src/routes/entries.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// create entry
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { type, data } = req.body; // data should be an object
  const dataStr = JSON.stringify(data || {});
  const stmt = db.prepare(`INSERT INTO entries (user_id, type, data) VALUES (?, ?, ?)`);
  stmt.run([userId, type, dataStr], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error' });
    }
    res.json({ id: this.lastID, user_id: userId, type, data: data });
  });
});

// list entries
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { type } = req.query;
  const sql = type ? `SELECT * FROM entries WHERE user_id = ? AND type = ? ORDER BY created_at DESC` : `SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC`;
  const params = type ? [userId, type] : [userId];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    const results = rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
    res.json(results);
  });
});

module.exports = router;
