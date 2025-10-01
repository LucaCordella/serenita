// src/server.js
require('dotenv').config();
const express = require('express');
const path = require('path'); // Adicionado o módulo path
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 4000;

// ensure DB and tables exist
require('./db');

app.use(cors());
app.use(express.json());

// --- INÍCIO DA CORREÇÃO PARA SERVIR O FRONTEND ---

// 1. Configura para servir arquivos estáticos (CSS, JS) da pasta 'src'
// Isso permite que o HTML encontre seus scripts e estilos.
app.use(express.static(path.join(__dirname, '..', 'src')));

// 2. Rota principal ('/') para servir a Landing Page
app.get('/', (req, res) => {
    // __dirname é a pasta atual (src), então navegamos para .. (pasta raiz do projeto)
    // e depois para src/pages/landing.html, que é onde o arquivo está.
    res.sendFile(path.join(__dirname, '..', 'src', 'pages', 'landing.html'));
});

// 3. Rota '/signup' para servir a página de Cadastro
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'pages', 'signup.html'));
});

// 4. Rota '/login' para servir a página de Login (para termos o ciclo completo)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'src', 'pages', 'login.html'));
});

// --- FIM DA CORREÇÃO ---


// routes
const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');

app.use('/api/auth', authRoutes);
app.use('/api/entries', entriesRoutes);

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));