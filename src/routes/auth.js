const express = require('express');
const router = express.Router();
const db = require('../db'); // Agora importa o Pool do Postgres
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;
const authenticateToken = require('../middleware/auth');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Postgres usa $1, $2... e RETURNING id para devolver o ID criado
    const query = 'INSERT INTO users (firstName, lastName, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id';
    const values = [firstName, lastName, email, password_hash];

    const result = await db.query(query, values);
    const userId = result.rows[0].id;
    
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: userId, firstName, lastName, email } });

  } catch (err) {
    if (err.code === '23505') { // Código de erro Postgres para Unique Violation (email duplicado)
      return res.status(409).json({ message: 'Email already in use' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

  const query = `
    SELECT id, firstName, lastName, email, password_hash, created_at, 
           biography, birthDate, avatar, reminderTime, emergencyContact 
    FROM users WHERE email = $1
  `;
  
  try {
    const result = await db.query(query, [email]);
    const row = result.rows[0];

    if (!row) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: '7d' });

    const user = { ...row };
    delete user.password_hash;

    try {
      if (user.emergencycontact) { // Postgres costuma retornar colunas em minúsculo
        user.emergencyContact = JSON.parse(user.emergencycontact);
      } else if (user.emergencyContact) {
         user.emergencyContact = JSON.parse(user.emergencyContact);
      }
    } catch (e) {
      user.emergencyContact = null;
    }

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Get Profile
router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const query = `
    SELECT id, firstName, lastName, email, created_at, 
           biography, birthDate, avatar, reminderTime, emergencyContact 
    FROM users WHERE id = $1
  `;
  
  try {
    const result = await db.query(query, [userId]);
    const row = result.rows[0];
    
    if (!row) return res.status(404).json({ message: 'User not found' });

    try {
       // Normalizando o nome da coluna caso o driver retorne lowercase
       const contact = row.emergencycontact || row.emergencyContact;
       if (contact) {
        row.emergencyContact = JSON.parse(contact);
      }
    } catch (e) {
      row.emergencyContact = null;
    }

    res.json({ user: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { 
    firstName, lastName, email, biography, birthDate, 
    avatar, reminderTime, emergencyContact 
  } = req.body;

  let emergencyContactStr = null;
  if (emergencyContact) {
    emergencyContactStr = JSON.stringify(emergencyContact);
  }

  const query = `
    UPDATE users SET 
      firstName = $1, lastName = $2, email = $3, biography = $4, 
      birthDate = $5, avatar = $6, reminderTime = $7, emergencyContact = $8
    WHERE id = $9
    RETURNING *
  `;

  const values = [
    firstName, lastName, email, biography, birthDate, 
    avatar, reminderTime, emergencyContactStr, userId
  ];

  try {
    const result = await db.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const updatedUser = result.rows[0];
    delete updatedUser.password_hash;
    
    // Parsear de volta para retornar bonito pro front
    try {
        if(updatedUser.emergencycontact) updatedUser.emergencyContact = JSON.parse(updatedUser.emergencycontact);
    } catch(e) {}

    res.json({ message: 'Perfil atualizado com sucesso', user: updatedUser });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Este e-mail já está em uso' });
    }
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;