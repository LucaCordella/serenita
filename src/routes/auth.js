// src/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// signup
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const stmt = db.prepare(`INSERT INTO users (firstName, lastName, email, password_hash) VALUES (?, ?, ?, ?)`);
    stmt.run([firstName, lastName, email, password_hash], function (err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }
      const userId = this.lastID;
      const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: userId, firstName, lastName, email } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  db.get(`SELECT id, firstName, lastName, email, password_hash FROM users WHERE email = ?`, [email], async (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error' });
    }
    if (!row) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: row.id, firstName: row.firstName, lastName: row.lastName, email: row.email } });
  });
});

// profile (protected)
const authenticateToken = require('../middleware/auth');
router.get('/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  db.get(`SELECT id, firstName, lastName, email, created_at FROM users WHERE id = ?`, [userId], (err, row) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!row) return res.status(404).json({ message: 'User not found' });
    res.json({ user: row });
  });
});

module.exports = router;
