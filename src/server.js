// src/server.js
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 4000;

// ensure DB and tables exist
require('./db');

app.use(cors());
app.use(express.json());

// routes
const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');

app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
