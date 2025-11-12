// src/routes/entries.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// create entry (Sem alterações) [cite: 139-152]
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { type, data } = req.body; // data should be an object
  const dataStr = JSON.stringify(data || {});

  const stmt = db.prepare('INSERT INTO entries (user_id, type, data) VALUES (?, ?, ?)');
  stmt.run([userId, type, dataStr], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'DB error' });
    }
    // Retorna o objeto completo que foi criado (incluindo o novo ID)
    res.status(201).json({ id: this.lastID, user_id: userId, type, data: data, created_at: new Date().toISOString() });
  });
});

// list entries (Sem alterações) [cite: 153-170]
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { type } = req.query;

  const sql = type
    ? 'SELECT * FROM entries WHERE user_id = ? AND type = ? ORDER BY created_at DESC'
    : 'SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC';
  const params = type ? [userId, type] : [userId];

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    // Precisamos fazer o parse do JSON que está na coluna 'data'
    const results = rows.map(r => ({ ...r, data: JSON.parse(r.data) }));
    res.json(results);
  });
});

// ===== NOVA ROTA: UPDATE Entry (PUT) =====
// Usada para marcar tarefas como concluídas
router.put('/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const entryId = req.params.id;
  const { data } = req.body; // O frontend enviará o objeto 'data' atualizado

  if (!data) {
    return res.status(400).json({ message: 'Dados ausentes' });
  }

  const dataStr = JSON.stringify(data);

  // O 'user_id = ?' garante que um usuário não possa atualizar a entrada de outro
  const sql = 'UPDATE entries SET data = ? WHERE id = ? AND user_id = ?';
  
  db.run(sql, [dataStr, entryId, userId], function (err) {
    if (err) {
      console.error('Erro ao atualizar entrada:', err);
      return res.status(500).json({ message: 'DB error' });
    }
    if (this.changes === 0) {
      // Isso pode acontecer se o ID não existir ou não pertencer ao usuário
      return res.status(404).json({ message: 'Entrada não encontrada ou não autorizada' });
    }
    res.json({ message: 'Entrada atualizada com sucesso' });
  });
});


// ===== NOVA ROTA: DELETE Entry =====
// Usada para excluir tarefas
router.delete('/:id', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const entryId = req.params.id;

  // O 'user_id = ?' garante que um usuário não possa deletar a entrada de outro
  const sql = 'DELETE FROM entries WHERE id = ? AND user_id = ?';

  db.run(sql, [entryId, userId], function (err) {
    if (err) {
      console.error('Erro ao deletar entrada:', err);
      return res.status(500).json({ message: 'DB error' });
    }
    if (this.changes === 0) {
      // Isso pode acontecer se o ID não existir ou não pertencer ao usuário
      return res.status(404).json({ message: 'Entrada não encontrada ou não autorizada' });
    }
    res.json({ message: 'Entrada deletada com sucesso' });
  });
});


module.exports = router;