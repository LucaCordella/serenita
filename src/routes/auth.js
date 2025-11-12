// src/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;
const authenticateToken = require('../middleware/auth'); // Seu middleware de autenticação

// Rota de Cadastro (Signup) - Sem alterações, já funcional
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const stmt = db.prepare('INSERT INTO users (firstName, lastName, email, password_hash) VALUES (?, ?, ?, ?)');
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
      
      // Retorna o usuário básico no signup
      res.json({ token, user: { id: userId, firstName, lastName, email } });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rota de Login (MODIFICADA para retornar todos os dados do usuário)
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  // Seleciona *todas* as colunas (incluindo as novas)
  const sql = `
    SELECT id, firstName, lastName, email, password_hash, created_at, 
           biography, birthDate, avatar, reminderTime, emergencyContact 
    FROM users WHERE email = ?
  `;
  
  db.get(sql, [email], async (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error' });
    }
    if (!row) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: '7d' });

    // Remove o hash da senha antes de enviar
    const user = { ...row };
    delete user.password_hash;

    // Decodificar JSON do emergencyContact
    try {
      if (user.emergencyContact) {
        user.emergencyContact = JSON.parse(user.emergencyContact);
      }
    } catch (e) {
      console.warn('Não foi possível parsear emergencyContact no login:', e);
      user.emergencyContact = null;
    }

    // Retorna o objeto 'user' completo
    res.json({ token, user }); 
  });
});

// Rota GET /profile (MODIFICADA para retornar todos os dados)
router.get('/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  // Seleciona *todas* as colunas (exceto hash da senha)
  const sql = `
    SELECT id, firstName, lastName, email, created_at, 
           biography, birthDate, avatar, reminderTime, emergencyContact 
    FROM users WHERE id = ?
  `;
  
  db.get(sql, [userId], (err, row) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!row) return res.status(404).json({ message: 'User not found' });

    // Decodificar JSON do emergencyContact
    try {
      if (row.emergencyContact) {
        row.emergencyContact = JSON.parse(row.emergencyContact);
      }
    } catch (e) {
      console.warn('Não foi possível parsear emergencyContact no GET /profile:', e);
      row.emergencyContact = null;
    }

    res.json({ user: row });
  });
});

// --- NOVA ROTA ---
// Rota PUT /profile (NOVA para salvar atualizações do perfil/configurações)
router.put('/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  // Campos permitidos para atualização
  const { 
    firstName, 
    lastName, 
    email, 
    biography, 
    birthDate, 
    avatar, 
    reminderTime, 
    emergencyContact 
  } = req.body;

  // Validação básica
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ message: 'Nome, sobrenome e e-mail são obrigatórios' });
  }

  // Serializar o contato de emergência (objeto) para texto JSON
  let emergencyContactStr = null;
  if (emergencyContact) {
    try {
      emergencyContactStr = JSON.stringify(emergencyContact);
    } catch (e) {
      console.error('Erro ao serializar emergencyContact:', e);
      return res.status(400).json({ message: 'Formato inválido do contato de emergência' });
    }
  }

  const sql = `
    UPDATE users SET 
      firstName = ?, 
      lastName = ?, 
      email = ?, 
      biography = ?, 
      birthDate = ?, 
      avatar = ?, 
      reminderTime = ?, 
      emergencyContact = ?
    WHERE id = ?
  `;

  const params = [
    firstName,
    lastName,
    email,
    biography,
    birthDate,
    avatar, // Avatar já está em base64 (texto)
    reminderTime,
    emergencyContactStr, // Contato de emergência como texto JSON
    userId
  ];

  db.run(sql, params, function (err) {
    if (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return res.status(409).json({ message: 'Este e-mail já está em uso por outra conta' });
      }
      console.error('Erro ao atualizar perfil no DB:', err);
      return res.status(500).json({ message: 'Erro no banco de dados' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Retorna os dados atualizados (exceto senha)
    const updatedUser = {
      id: userId,
      firstName,
      lastName,
      email,
      biography,
      birthDate,
      avatar,
      reminderTime,
      emergencyContact // Retorna o objeto original
    };

    res.json({ message: 'Perfil atualizado com sucesso', user: updatedUser });
  });
});


module.exports = router;